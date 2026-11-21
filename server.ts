import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { Type } from '@google/genai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import {
  getGeminiClient,
  hasGeminiApiKey,
  getMaskedApiKey,
  executeGeminiWithRetry,
  parseGeminiError,
  cleanAiResponse,
  cleanAndParseGeminiJson,
  truncateAiInputText,
  buildAiSuccessResponse,
  buildAiErrorResponse,
  GEMINI_CHAT_MODEL,
  GEMINI_TRANSCRIBE_MODEL,
  GEMINI_MISSING_KEY_MESSAGE,
  getActiveModelName,
  getConfiguredModelName,
  getConfiguredTranscribeModelName,
} from './lib/gemini.ts';

dotenv.config();

import {
  registerUser,
  loginUser,
  verifySessionToken,
  logoutUser,
  verifyEmailWithToken,
  resendVerificationEmail,
  requestPasswordReset,
  resetPasswordWithToken,
  updateUserProfile,
  updateUserAvatar,
  deleteUserAvatar,
  updateUserLanguage,
  getUserWorkspace,
  saveSubject,
  deleteSubject,
  getUserSubscription,
  createPendingTransaction,
  confirmPaymentAndUpgrade,
  cancelUserSubscription,
  getUserTransactions,
  getTransactionById,
  getTransactionByOrderId,
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  customerConfirmOrderPayment,
  attachOrderReceipt,
  getWaitingVerificationOrders,
  getAllAdminOrders,
  adminApproveOrder,
  adminRejectOrder,
  generateOrderCode,
  PLAN_PRICING,
  saveLessonMindMap,
  getLessonMindMap,
  deleteLessonMindMap,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUserNotificationSettings,
  updateUserNotificationSettings,
  checkAndSendDeadlineNotifications,
  checkAndSendPremiumExpiryNotifications,
  assertOwnership,
  checkSubjectLimit,
  getPendingVerificationInfo,
  subjectsMap,
  lessonsMap,
  documentsMap,
  deadlinesMap,
  flashcardsMap,
  quizzesMap,
  isUserPremium as dbIsUserPremium,
} from './lib/authDb.ts';
import {
  validateEmailConfigOnStartup,
  verifySmtpConnection,
  saveRuntimeSmtpConfig,
} from './lib/emailService.ts';
import { momoProvider, zalopayProvider } from './lib/paymentService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directories
const audioUploadDir = path.resolve(__dirname, 'uploads', 'audio');
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

const documentUploadDir = path.resolve(__dirname, 'uploads', 'documents');
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, { recursive: true });
}

const avatarUploadDir = path.resolve(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const receiptUploadDir = path.resolve(__dirname, 'uploads', 'receipts');
if (!fs.existsSync(receiptUploadDir)) {
  fs.mkdirSync(receiptUploadDir, { recursive: true });
}

// Global AI status tracking for Settings and Monitoring
export const aiSystemStatus = {
  lastQuotaStatus: 'normal' as 'normal' | 'rate_limited' | 'quota_exceeded' | 'auth_error' | 'server_error',
  lastRequestAt: null as string | null,
  lastError: null as string | null,
  lastErrorCode: null as string | null,
  retryAfter: null as string | number | null,
};

// Multer storage configurations
const audioDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, audioUploadDir);
  },
  filename: (_req, file, cb) => {
    const fileId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let ext = path.extname(file.originalname || '');
    if (!ext) {
      if (file.mimetype.includes('mp4')) ext = '.mp4';
      else if (file.mimetype.includes('wav')) ext = '.wav';
      else if (file.mimetype.includes('mpeg') || file.mimetype.includes('mp3')) ext = '.mp3';
      else if (file.mimetype.includes('ogg')) ext = '.ogg';
      else if (file.mimetype.includes('m4a')) ext = '.m4a';
      else ext = '.webm';
    }
    cb(null, `${fileId}${ext}`);
  },
});

const documentDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentUploadDir);
  },
  filename: (_req, file, cb) => {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ext = path.extname(file.originalname || '');
    cb(null, `${docId}${ext}`);
  },
});

const uploadAudioDisk = multer({
  storage: audioDiskStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const uploadDocumentDisk = multer({
  storage: documentDiskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const avatarDiskStorage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const userId = req.userId || 'general';
    const userDir = path.resolve(avatarUploadDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext) ext = file.mimetype.includes('png') ? '.png' : file.mimetype.includes('webp') ? '.webp' : '.jpg';
    cb(null, `profile-${Date.now()}${ext}`);
  },
});

const uploadAvatarDisk = multer({
  storage: avatarDiskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận các định dạng ảnh: JPG, JPEG, PNG, WEBP.'));
    }
  },
});

const receiptDiskStorage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const orderId = req.params.orderId || 'general';
    const targetDir = path.resolve(receiptUploadDir, orderId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext) ext = file.mimetype.includes('png') ? '.png' : file.mimetype.includes('webp') ? '.webp' : '.jpg';
    cb(null, `receipt-${Date.now()}${ext}`);
  },
});

const uploadReceiptDisk = multer({
  storage: receiptDiskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận các định dạng ảnh biên lai: JPG, JPEG, PNG, WEBP.'));
    }
  },
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Multer error handling middleware wrapper for audio upload (supports both 'file' and 'audio' field names)
const audioUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  uploadAudioDisk.any()(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          errorCode: 'FILE_TOO_LARGE',
          message: 'File âm thanh vượt quá giới hạn 100MB.',
        });
      }
      return res.status(400).json({
        success: false,
        errorCode: 'AUDIO_UPLOAD_FAILED',
        message: 'Lỗi tải lên file âm thanh: ' + (err.message || 'Lỗi không xác định'),
      });
    }
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

const memoryAudioUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  uploadMemory.any()(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          errorCode: 'FILE_TOO_LARGE',
          message: 'File âm thanh vượt quá giới hạn 100MB.',
        });
      }
      return res.status(400).json({
        success: false,
        errorCode: 'AUDIO_UPLOAD_FAILED',
        message: 'Lỗi tải lên file âm thanh: ' + (err.message || 'Lỗi không xác định'),
      });
    }
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

// Storage interfaces
interface AudioMetadata {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration: number;
  subjectId?: string;
  lessonId?: string;
  userId?: string;
  filePath: string;
  createdAt: string;
}

export interface StoredLesson {
  id: string;
  ownerId: string;
  subjectId: string;
  title: string;
  transcript?: string;
  summary?: string;
  keyPoints?: any[];
  concepts?: any[];
  keywords?: string[];
  mindMap?: any;
  flashcards?: any[];
  quizQuestions?: any[];
  exercises?: any[];
  deadlines?: any[];
  audioUrl?: string;
  storagePath?: string;
  audioDuration?: number;
  audioSize?: number;
  audioMimeType?: string;
  audioFileId?: string;
  status?: string;
  transcriptionStatus?: string;
  summaryStatus?: string;
  analysisStatus?: string;
  analysisError?: string;
  analyzedAt?: string;
  sourceType?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface StoredSubject {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  description?: string;
}

export interface StoredDocument {
  id: string;
  ownerId: string;
  subjectId: string;
  lessonId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  fileUrl: string;
  extractedText: string;
  summary: string;
  keyTakeaways?: string[];
  summaryStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'quota_exceeded';
  summaryCreatedAt?: string;
  summaryModel?: string;
  summaryError?: string;
  summaryVersion?: number;
  lastRequestAt?: string;
  processingStatus: 'pending' | 'uploading' | 'extracting' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const audioMetadataStore = new Map<string, AudioMetadata>();
const lessonStore = lessonsMap;
const subjectStore = subjectsMap;
const documentStore = documentsMap;

// User daily usage tracking
interface UserDailyUsage {
  userId: string;
  date: string;
  aiRequests: number;
  summaryRequests: number;
  transcriptionRequests: number;
  quizRequests: number;
  flashcardRequests: number;
}
const userDailyUsageStore = new Map<string, UserDailyUsage>();

// Seed default subjects and lessons for default user (persisted in unified store)
if (!subjectStore.has('sub_web_01')) {
  subjectStore.set('sub_web_01', {
    id: 'sub_web_01',
    ownerId: 'usr_demo_101',
    name: 'Lập trình Web nâng cao',
    code: 'CS301',
    description: 'Kiến trúc Frontend hiện đại, React 19, Server-Side Rendering, State Management và tối ưu hiệu năng web.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

if (!subjectStore.has('sub_db_02')) {
  subjectStore.set('sub_db_02', {
    id: 'sub_db_02',
    ownerId: 'usr_demo_101',
    name: 'Cơ sở dữ liệu nâng cao',
    code: 'IT202',
    description: 'Thiết kế cơ sở dữ liệu quan hệ, đánh chỉ mục Indexing, Query Optimization, Transaction ACID và NoSQL.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

if (!subjectStore.has('sub_mkt_03')) {
  subjectStore.set('sub_mkt_03', {
    id: 'sub_mkt_03',
    ownerId: 'usr_demo_101',
    name: 'Marketing căn bản',
    code: 'MK101',
    description: 'Hành vi người tiêu dùng, nghiên cứu thị trường, chiến lược 4P, định vị thương hiệu và Marketing kỹ thuật số.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

if (!lessonStore.has('les_demo_01')) {
  lessonStore.set('les_demo_01', {
    id: 'les_demo_01',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    title: 'Tối ưu hiệu năng React 19 & Concurrent Features',
    transcript: `Chào các em sinh viên! Trong bài học hôm nay chúng ta tìm hiểu sâu hơn về kiến trúc React 19 và các kỹ thuật tối ưu hóa hiệu năng render.
Khái niệm đầu tiên là Memoization. Trong React, việc re-render component con không cần thiết là nguyên nhân phổ biến làm suy giảm trải nghiệm người dùng.
useCallback được dùng để lưu trữ tham chiếu của một hàm qua các lần render, tránh việc con bị render lại khi nhận prop là function.
useMemo dùng để ghi nhớ kết quả tính toán phức tạp. Chỉ khi các dependency thay đổi thì biểu thức bên trong mới được tính lại.
Tiếp theo, React 19 mang đến Compiler tự động tối ưu mà không cần lập trình viên phải tự viết useMemo hoặc useCallback thủ công trong đa số trường hợp.
Về hạn nộp bài tập: Cả lớp cần hoàn thành bài tập thực hành số 2 về tối ưu DOM và nộp trước ngày 28/10/2026 trên cổng đào tạo.`,
    summary: `Bài giảng phân tích các kỹ thuật tối ưu hóa hiệu năng trong React 19, đặc biệt là cơ chế Memoization thông qua useCallback và useMemo. Lập trình viên cần hiểu rõ cách hoạt động của React Compiler để tự động hóa quá trình tối ưu. Giảng viên yêu cầu nộp bài tập thực hành số 2 trước ngày 28/10/2026.`,
    keyPoints: [
      { title: 'Cơ chế Memoization', content: 'useCallback giữ nguyên tham chiếu hàm, useMemo lưu trữ kết quả phép tính phức tạp.', importance: 'high' },
      { title: 'React 19 Compiler', content: 'Tự động phân tích và tối ưu hóa component mà không cần bọc thủ công.', importance: 'high' },
      { title: 'Hạn nộp bài tập', content: 'Bài tập thực hành số 2 phải nộp trước 28/10/2026.', importance: 'medium' },
    ],
    concepts: [
      { term: 'Memoization', definition: 'Kỹ thuật lưu trữ kết quả tính toán nhằm tránh việc thực thi lại các tác vụ tốn kém tài nguyên.' },
    ],
    keywords: ['React 19', 'useCallback', 'useMemo', 'Compiler', 'Hiệu năng'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// Seed default document with rich extractedText and cached summary
const seedDocId = 'doc_demo_seed_01';
const seedDocPath = path.join(documentUploadDir, 'GiaoTrinh_React19_HieuNang.txt');
const seedDocContent = `CHƯƠNG 4: TỐI ƯU HÓA HIỆU NĂNG ỨNG DỤNG REACT 19
1. Khái niệm Virtual DOM và Cơ chế Re-rendering:
Khi một component trong React thay đổi state hoặc nhận props mới, React sẽ thực hiện quy trình so khớp Virtual DOM (Reconciliation). Nếu một hàm hay object được tạo mới trong quá trình render, nó sẽ tạo ra reference mới, khiến các component con phụ thuộc phải re-render lại dù giá trị thực tế không thay đổi.

2. React Compiler trong React 19:
React 19 giới thiệu React Compiler tự động memoize các giá trị và component, loại bỏ sự cần thiết của useCallback và useMemo thủ công trong 90% trường hợp.

3. Hạn nộp bài tập lớn và đồ án:
- Sinh viên phải nộp Đồ án Xây dựng Nền tảng học tập thông minh trước ngày 15/11/2026 lúc 23:59 qua cổng LMS.
- Bài kiểm tra trắc nghiệm giữa kỳ diễn ra vào ngày 05/11/2026 tại phòng máy B2-304.`;

if (!fs.existsSync(seedDocPath)) {
  try {
    fs.writeFileSync(seedDocPath, seedDocContent, 'utf-8');
  } catch {}
}

if (!documentStore.has(seedDocId)) {
  documentStore.set(seedDocId, {
    id: seedDocId,
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    lessonId: 'les_demo_01',
    fileName: 'GiaoTrinh_React19_HieuNang.txt',
    fileType: 'text/plain',
    fileSize: 4200,
    storagePath: seedDocPath,
    fileUrl: `/api/documents/${seedDocId}/download`,
    extractedText: seedDocContent,
    summary: `Tài liệu tóm tắt các nguyên lý tối ưu hiệu năng React 19, giải thích cơ chế Reconciliation của Virtual DOM, giới thiệu React Compiler tự động memoize và các mốc deadline quan trọng gồm Đồ án (15/11/2026) và Kiểm tra giữa kỳ (05/11/2026).`,
    keyTakeaways: [
      'Virtual DOM thực hiện Reconciliation khi state/props đổi',
      'React Compiler tự động tối ưu hóa mà không cần bọc thủ công useCallback',
      'Hạn nộp Đồ án Xây dựng nền tảng học tập: 15/11/2026',
      'Kiểm tra giữa kỳ ngày 05/11/2026 tại phòng B2-304',
    ],
    summaryStatus: 'completed',
    summaryCreatedAt: new Date(Date.now() - 3600000).toISOString(),
    summaryModel: GEMINI_CHAT_MODEL,
    summaryVersion: 1,
    processingStatus: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware for parsing JSON with large payloads and preserving rawBody for Stripe webhooks
app.use(
  express.json({
    limit: '65mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '65mb' }));

// Attach Request ID to every incoming request (never logs sensitive secrets)
app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Helper safe JSON parser
function safeParseJson<T>(rawText: string | undefined | null, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let isArray = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isArray = true;
  }

  if (startIdx !== -1) {
    const lastChar = isArray ? ']' : '}';
    const endIdx = cleaned.lastIndexOf(lastChar);
    if (endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    try {
      return JSON.parse(cleaned);
    } catch {
      return fallback;
    }
  }
}

// Authentication Middleware & User Helpers
export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
  rawBody?: Buffer;
  requestId?: string;
}

export const DEMO_SHARED_IDS = new Set([
  'sub_web_01',
  'sub_db_02',
  'sub_mkt_03',
  'sub_general',
  'les_demo_01',
  'les_react_hooks_01',
  'les_db_index_02',
  'les_mkt_4p_03',
  'doc_demo_seed_01',
]);

export function canAccessSharedOrOwned(
  ownerId: string | undefined,
  userId: string,
  entityId?: string
): boolean {
  if (!ownerId || ownerId === userId) return true;
  if (entityId && DEMO_SHARED_IDS.has(entityId)) return true;
  return false;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }
  const customToken = (req.headers['x-auth-token'] as string) || (req.headers['x-user-id'] as string);
  if (customToken && customToken.trim()) {
    return customToken.trim();
  }
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res
      .status(401)
      .json(buildAiErrorResponse('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục.'));
  }

  let verified = verifySessionToken(token);
  if ((!verified.valid || !verified.user) && req.headers['x-user-id']) {
    const fallbackUserId = String(req.headers['x-user-id']).trim();
    if (fallbackUserId && fallbackUserId !== token) {
      verified = verifySessionToken(fallbackUserId);
    }
  }

  if (!verified.valid || !verified.user) {
    return res
      .status(401)
      .json(
        buildAiErrorResponse(
          verified.errorCode || 'UNAUTHORIZED',
          verified.message || 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
        )
      );
  }

  req.userId = verified.user.id;
  req.user = verified.user;
  next();
}

export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, next);
}

export function resolveUserId(req: Request): string {
  const token = extractBearerToken(req);
  if (token) {
    const verified = verifySessionToken(token);
    if (verified.valid && verified.user) {
      return verified.user.id;
    }
  }
  const fallbackUserId = req.headers['x-user-id'] ? String(req.headers['x-user-id']).trim() : '';
  if (fallbackUserId) {
    const verifiedFallback = verifySessionToken(fallbackUserId);
    if (verifiedFallback.valid && verifiedFallback.user) {
      return verifiedFallback.user.id;
    }
  }
  return '';
}

export function getCurrentUserId(req: AuthenticatedRequest): string {
  return req.userId || resolveUserId(req);
}

export function getCurrentUser(req: AuthenticatedRequest): any {
  return req.user || null;
}

// Subscription Records
export interface SubscriptionRecord {
  userId: string;
  plan: 'free' | 'premium';
  status: 'active' | 'trial' | 'canceled' | 'past_due' | 'incomplete';
  startDate: string;
  endDate: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cancelAtPeriodEnd: boolean;
}

const subscriptionStore = new Map<string, SubscriptionRecord>();

subscriptionStore.set('usr_demo_101', {
  userId: 'usr_demo_101',
  plan: 'free',
  status: 'active',
  startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
  endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
  cancelAtPeriodEnd: false,
});

function isUserPremium(userId: string): boolean {
  if (dbIsUserPremium(userId)) return true;
  const sub = getUserSubscription(userId) || subscriptionStore.get(userId);
  if (!sub) return false;

  if (sub.plan === 'premium') {
    if (sub.status === 'active' || (sub.status as string) === 'trial' || (sub.status as string) === 'trialing') return true;
    if (((sub.status as string) === 'canceled' || (sub.status as string) === 'cancelled') && new Date() < new Date(sub.endDate)) {
      return true;
    }
  }
  return false;
}

// Per-User backend usage limit check (Section 7)
function checkUserActionLimit(
  userId: string,
  actionType: 'summary' | 'transcription' | 'chat' | 'quiz' | 'flashcard'
): { allowed: boolean; message?: string } {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}_${today}`;
  let usage = userDailyUsageStore.get(key);

  if (!usage) {
    usage = {
      userId,
      date: today,
      aiRequests: 0,
      summaryRequests: 0,
      transcriptionRequests: 0,
      quizRequests: 0,
      flashcardRequests: 0,
    };
    userDailyUsageStore.set(key, usage);
  }

  const premium = isUserPremium(userId);
  const limits = {
    summary: premium ? 300 : 30,
    transcription: premium ? 200 : 25,
    chat: premium ? 500 : 60,
    quiz: premium ? 300 : 30,
    flashcard: premium ? 300 : 30,
  };

  const currentCount =
    actionType === 'summary'
      ? usage.summaryRequests
      : actionType === 'transcription'
      ? usage.transcriptionRequests
      : actionType === 'chat'
      ? usage.aiRequests
      : actionType === 'quiz'
      ? usage.quizRequests
      : usage.flashcardRequests;

  const maxAllowed = limits[actionType] || 50;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      message: `Bạn đã sử dụng hết số lượt ${
        actionType === 'summary' ? 'tóm tắt' : actionType === 'transcription' ? 'phiên âm' : 'yêu cầu'
      } của gói ${premium ? 'Premium' : 'miễn phí'} trong ngày (${maxAllowed} lượt). Vui lòng ${
        premium ? 'đợi quota reset vào ngày mai.' : 'nâng cấp gói Premium để tiếp tục.'
      }`,
    };
  }

  // Increment usage
  if (actionType === 'summary') usage.summaryRequests++;
  else if (actionType === 'transcription') usage.transcriptionRequests++;
  else if (actionType === 'chat') usage.aiRequests++;
  else if (actionType === 'quiz') usage.quizRequests++;
  else if (actionType === 'flashcard') usage.flashcardRequests++;

  return { allowed: true };
}

// Legacy monthly quota middleware
const usageStore = new Map<string, { aiRequests: number; audioMinutes: number; month: string }>();

function checkAiQuota(req: Request, res: Response, next: NextFunction) {
  const userId = resolveUserId(req);
  const currentMonth = new Date().toISOString().slice(0, 7);

  let userUsage = usageStore.get(userId);
  if (!userUsage || userUsage.month !== currentMonth) {
    userUsage = { aiRequests: 0, audioMinutes: 0, month: currentMonth };
    usageStore.set(userId, userUsage);
  }

  const premium = isUserPremium(userId);
  const maxAi = premium ? 20000 : 800;

  if (userUsage.aiRequests >= maxAi) {
    return res.status(429).json({
      success: false,
      errorCode: 'AI_QUOTA_EXCEEDED',
      message: 'Bạn đã đạt giới hạn yêu cầu AI của gói hiện tại trong tháng. Vui lòng nâng cấp gói Premium để tiếp tục sử dụng!',
      canRetry: false,
    });
  }

  userUsage.aiRequests++;
  next();
}

// ====================================================================
// Authentication Endpoints (PHẦN 1 & PHẦN 2)
// ====================================================================

function resolveRequestBaseUrl(req: Request): string {
  const envBase = (process.env.APP_BASE_URL || process.env.APP_URL || '').trim().replace(/\/$/, '');
  const isEnvLocal =
    !envBase ||
    envBase.includes('localhost') ||
    envBase.includes('127.0.0.1') ||
    envBase.includes('0.0.0.0');

  if (envBase && !isEnvLocal) {
    return envBase;
  }

  const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.host || '';
  const proto = forwardedProto || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');

  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`;
  }

  return envBase || (host ? `${proto}://${host}` : 'http://localhost:3000');
}

// Register: POST /api/auth/register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      school,
      major,
      academicYear,
      agreeTerms,
      language,
      otpVerified,
    } = req.body;
    const lang: 'vi' | 'en' = language === 'en' ? 'en' : 'vi';

    if (agreeTerms === false) {
      return res.status(400).json({
        success: false,
        accountCreated: false,
        verificationEmailSent: false,
        emailSent: false,
        code: 'TERMS_NOT_ACCEPTED',
        errorCode: 'TERMS_NOT_ACCEPTED',
        message:
          lang === 'en'
            ? 'Please agree to the Terms of Service.'
            : 'Vui lòng đồng ý với điều khoản sử dụng.',
      });
    }

    const result = await registerUser({
      fullName,
      email,
      password,
      confirmPassword,
      school,
      major,
      academicYear,
      language: lang,
      appBaseUrl: resolveRequestBaseUrl(req),
      otpVerified: Boolean(otpVerified),
    });

    // Case 1: Account was NOT created (validation error or duplicate email)
    if (!result.accountCreated) {
      return res.status(result.emailAlreadyExists ? 409 : 400).json({
        success: false,
        accountCreated: false,
        verificationEmailSent: false,
        emailSent: false,
        emailAlreadyExists: Boolean(result.emailAlreadyExists),
        emailVerified: result.emailVerified,
        canResendVerification: Boolean(result.canResendVerification),
        code: result.code || result.errorCode || 'REGISTRATION_FAILED',
        errorCode: result.errorCode || 'REGISTRATION_FAILED',
        message: result.message,
      });
    }

    // Case 2: Account created, but verification email failed to send (Requirement 3)
    if (!result.verificationEmailSent) {
      return res.status(201).json({
        success: false,
        accountCreated: true,
        verificationEmailSent: false,
        emailSent: false,
        code: 'VERIFICATION_EMAIL_SEND_FAILED',
        errorCode: result.errorCode || 'VERIFICATION_EMAIL_SEND_FAILED',
        emailErrorCode: result.emailErrorCode,
        emailProvider: result.emailProvider,
        verificationUrl: result.verificationUrl,
        verificationToken: result.verificationToken,
        user: result.user,
        token: result.token,
        message: result.message,
      });
    }

    // Case 3: Account created AND verification email sent confirmed by SMTP/provider
    return res.status(201).json({
      success: true,
      accountCreated: true,
      verificationEmailSent: true,
      emailSent: true,
      code: 'VERIFICATION_EMAIL_SENT',
      user: result.user,
      token: result.token,
      emailProvider: result.emailProvider,
      verificationUrl: result.verificationUrl,
      verificationToken: result.verificationToken,
      emailPreviewUrl: result.emailPreviewUrl,
      message: result.message,
    });
  } catch (err: any) {
    console.error('Register endpoint error:', err);
    return res.status(500).json({
      success: false,
      accountCreated: false,
      verificationEmailSent: false,
      emailSent: false,
      code: 'SERVER_ERROR',
      errorCode: 'SERVER_ERROR',
      message: 'Không thể tạo tài khoản. Vui lòng thử lại.',
    });
  }
});

// Safe Email Service Diagnostics: GET /api/email/status (never exposes passwords or secrets)
app.get('/api/email/status', async (_req: Request, res: Response) => {
  try {
    const status = await verifySmtpConnection();
    return res.json({
      success: status.configured && status.connected,
      configured: status.configured,
      connected: status.connected,
      provider: status.provider,
      host: status.host,
      port: status.port,
      secure: status.secure,
      user: status.user,
      missingVars: status.missingVars,
      errorCode: status.errorCode,
      message: status.message,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      configured: false,
      connected: false,
      errorCode: 'EMAIL_STATUS_CHECK_FAILED',
      message: 'Không thể kiểm tra trạng thái dịch vụ email.',
    });
  }
});

// Configure SMTP at runtime: POST /api/email/configure-smtp
app.post('/api/email/configure-smtp', async (req: Request, res: Response) => {
  try {
    const { host, port, secure, user, pass, mailFrom } = req.body;
    if (!user || !pass) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ địa chỉ email SMTP (SMTP_USER) và mật khẩu ứng dụng (SMTP_PASSWORD).',
      });
    }

    saveRuntimeSmtpConfig({
      host: (host || 'smtp.gmail.com').trim(),
      port: Number(port || 587),
      secure: Boolean(secure ?? Number(port) === 465),
      user: String(user).trim(),
      pass: String(pass).trim(),
      mailFrom: mailFrom ? String(mailFrom).trim() : '',
    });

    const status = await verifySmtpConnection();
    if (!status.connected) {
      return res.status(400).json({
        success: false,
        configured: status.configured,
        connected: false,
        errorCode: status.errorCode,
        message:
          status.message ||
          'Đã lưu cấu hình nhưng không thể kết nối tới máy chủ SMTP. Vui lòng kiểm tra lại Gmail App Password.',
      });
    }

    return res.json({
      success: true,
      configured: true,
      connected: true,
      provider: status.provider,
      message: 'Đã lưu và xác thực kết nối SMTP thành công! Bạn có thể gửi lại email xác nhận ngay.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Không thể lưu cấu hình SMTP: ' + (err?.message || 'Lỗi máy chủ'),
    });
  }
});

// Get Pending Verification Info for Current/Target User: GET /api/auth/verification-info
app.get('/api/auth/verification-info', async (req: Request, res: Response) => {
  try {
    const queryEmail = (req.query.email as string) || '';
    const authUserId = resolveUserId(req);
    const identifier = queryEmail.trim() || authUserId;
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin tài khoản cần kiểm tra.',
      });
    }

    const info = await getPendingVerificationInfo(identifier, resolveRequestBaseUrl(req));
    return res.json(info);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin xác nhận.',
    });
  }
});

// Login: POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        errorCode: result.errorCode || 'INVALID_CREDENTIALS',
        message: result.message,
      });
    }

    return res.json({
      success: true,
      user: result.user,
      token: result.token,
      message: result.message,
    });
  } catch (err: any) {
    console.error('Login endpoint error:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Lỗi máy chủ khi đăng nhập. Vui lòng thử lại sau.',
    });
  }
});

// Email Verification: POST /api/auth/verify-email
app.post('/api/auth/verify-email', (req: Request, res: Response) => {
  try {
    const { token, language } = req.body;
    const lang: 'vi' | 'en' = language === 'en' ? 'en' : 'vi';

    if (!token) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_TOKEN',
        message:
          lang === 'en'
            ? 'Verification token is missing.'
            : 'Thiếu mã xác nhận email.',
      });
    }

    const result = verifyEmailWithToken(String(token), lang);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        alreadyVerified: result.alreadyVerified,
        user: result.user,
        token: result.token,
        email: result.email,
        errorCode: result.errorCode,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      user: result.user,
      token: result.token,
      email: result.email,
      message: result.message,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Lỗi xác minh email: ' + err.message,
    });
  }
});

// Resend Verification Email: POST /api/auth/resend-verification
app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email, language } = req.body;
    const lang: 'vi' | 'en' | undefined =
      language === 'en' ? 'en' : language === 'vi' ? 'vi' : undefined;
    const authUserId = resolveUserId(req);
    const identifier = (email && String(email).trim()) || authUserId;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        emailSent: false,
        errorCode: 'MISSING_IDENTIFIER',
        message:
          lang === 'en'
            ? 'Please provide the email address to resend the verification link.'
            : 'Vui lòng cung cấp địa chỉ email cần gửi lại liên kết xác nhận.',
      });
    }

    const result = await resendVerificationEmail(identifier, {
      language: lang,
      appBaseUrl: resolveRequestBaseUrl(req),
    });

    if (!result.success) {
      if (result.errorCode === 'RATE_LIMITED' || result.errorCode === 'MAX_RESEND_EXCEEDED') {
        return res.status(429).json({
          success: false,
          emailSent: false,
          errorCode: result.errorCode,
          message: result.message,
          cooldownSeconds: result.cooldownSeconds,
          remainingAttempts: result.remainingAttempts,
        });
      }

      if (result.errorCode === 'ALREADY_VERIFIED') {
        return res.status(400).json({
          success: false,
          emailSent: false,
          alreadyVerified: true,
          errorCode: 'ALREADY_VERIFIED',
          message: result.message,
        });
      }

      if (result.errorCode === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          emailSent: false,
          errorCode: 'USER_NOT_FOUND',
          message: result.message,
        });
      }

      return res.status(502).json({
        success: false,
        emailSent: false,
        emailProvider: result.emailProvider,
        verificationUrl: result.verificationUrl,
        verificationToken: result.verificationToken,
        errorCode: result.errorCode || 'EMAIL_SEND_FAILED',
        message: result.message,
      });
    }

    return res.json({
      success: true,
      emailSent: true,
      email: result.email,
      emailProvider: result.emailProvider,
      verificationUrl: result.verificationUrl,
      verificationToken: result.verificationToken,
      emailPreviewUrl: result.emailPreviewUrl,
      cooldownSeconds: result.cooldownSeconds,
      remainingAttempts: result.remainingAttempts,
      message: result.message,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      emailSent: false,
      errorCode: 'SERVER_ERROR',
      message: 'Lỗi gửi lại email: ' + err.message,
    });
  }
});

// Current User Me: GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sub = getUserSubscription(req.userId!);
  return res.json({
    success: true,
    user: req.user,
    subscription: sub,
  });
});

// Logout: POST /api/auth/logout
app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const token = extractBearerToken(req);
  if (token) {
    logoutUser(token);
  }
  return res.json({
    success: true,
    message: 'Đăng xuất thành công.',
  });
});

// Forgot Password: POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_EMAIL',
      message: 'Email không hợp lệ.',
    });
  }

  const result = await requestPasswordReset(email);
  if (!result.success && result.cooldownSeconds) {
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMITED',
      message: result.message,
      cooldownSeconds: result.cooldownSeconds,
    });
  }

  return res.json({
    success: true,
    message: result.message,
  });
});

// Reset Password: POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token) {
    return res.status(400).json({
      success: false,
      errorCode: 'MISSING_TOKEN',
      message: 'Thiếu mã đặt lại mật khẩu.',
    });
  }
  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      errorCode: 'PASSWORD_MISMATCH',
      message: 'Hai mật khẩu không khớp.',
    });
  }

  const result = resetPasswordWithToken(token, newPassword);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    });
  }

  return res.json({
    success: true,
    message: result.message,
  });
});

// ====================================================================
// User Profile & Avatar Endpoints (PHẦN 6 & PHẦN 7)
// ====================================================================

// Get Profile: GET /api/profile
app.get('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sub = getUserSubscription(req.userId!);
  const workspace = getUserWorkspace(req.userId!);
  return res.json({
    success: true,
    user: req.user,
    subscription: sub,
    subjectsCount: workspace.subjects.length,
    lessonsCount: workspace.lessons.length,
    documentsCount: workspace.documents.length,
  });
});

// Update Profile: PUT /api/profile
app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { fullName, school, major, academicYear, timezone, notifications } = req.body;
  const result = updateUserProfile(req.userId!, {
    fullName,
    school,
    major,
    academicYear,
    timezone,
    notifications,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return res.json({
    success: true,
    user: result.user,
    message: 'Hồ sơ đã được cập nhật.',
  });
});

// Upload Avatar: POST /api/profile/avatar
app.post('/api/profile/avatar', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  uploadAvatarDisk.single('avatar')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        errorCode: 'AVATAR_UPLOAD_FAILED',
        message: err.message || 'Lỗi khi tải lên ảnh đại diện.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        errorCode: 'NO_FILE',
        message: 'Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP).',
      });
    }

    const filename = path.basename(req.file.path);
    const avatarUrl = `/api/avatars/${req.userId}/${filename}`;
    const result = updateUserAvatar(req.userId!, avatarUrl);

    return res.json({
      success: true,
      avatarUrl,
      user: result.user,
      message: 'Ảnh đại diện đã được cập nhật.',
    });
  });
});

// Delete Avatar: DELETE /api/profile/avatar
app.delete('/api/profile/avatar', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const result = deleteUserAvatar(req.userId!);
  return res.json({
    success: true,
    user: result.user,
    message: 'Ảnh đại diện đã được cập nhật.',
  });
});

// Serve Avatar Static File: GET /api/avatars/:userId/:filename
app.get('/api/avatars/:userId/:filename', (req: Request, res: Response) => {
  const { userId, filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(avatarUploadDir, userId, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Ảnh đại diện không tồn tại.' });
  }

  let mimeType = 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (filePath.endsWith('.webp')) mimeType = 'image/webp';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(filePath).pipe(res);
});

// ====================================================================
// Per-User Workspace Endpoints (PHẦN 3 & PHẦN 4)
// ====================================================================

// Get User Workspace: GET /api/user/workspace
app.get('/api/user/workspace', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const workspace = getUserWorkspace(req.userId!);
  return res.json({
    success: true,
    ...workspace,
  });
});

// List Subjects: GET /api/subjects
app.get('/api/subjects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const workspace = getUserWorkspace(req.userId!);
  return res.json({
    success: true,
    subjects: workspace.subjects,
  });
});

// Create/Update Subject with 4-Subject Limit: POST /api/subjects
app.post('/api/subjects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const result = saveSubject(req.userId!, req.body);
  if (!result.success) {
    return res.status(result.errorCode === 'FORBIDDEN' ? 403 : result.errorCode === 'PLAN_LIMIT_EXCEEDED' ? 403 : 400).json({
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    });
  }
  return res.status(201).json({
    success: true,
    subject: result.subject,
    message: result.message,
  });
});

// Update Subject: PUT /api/subjects/:id
app.put('/api/subjects/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const result = saveSubject(req.userId!, { ...req.body, id: req.params.id });
  if (!result.success) {
    return res.status(result.errorCode === 'FORBIDDEN' ? 403 : 400).json({
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    });
  }
  return res.json({
    success: true,
    subject: result.subject,
    message: result.message,
  });
});

// Delete Subject: DELETE /api/subjects/:id
app.delete('/api/subjects/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const result = deleteSubject(req.userId!, req.params.id);
  if (!result.success) {
    return res.status(result.errorCode === 'FORBIDDEN' ? 403 : 404).json({
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    });
  }
  return res.json({
    success: true,
    message: result.message,
  });
});

// ====================================================================
// System Status & AI Diagnostics: GET /api/system-status, GET /api/ai/status (Section 9)
// ====================================================================
app.get('/api/system-status', (_req: Request, res: Response) => {
  const hasKey = hasGeminiApiKey();
  res.json({
    hasApiKey: hasKey,
    model: getActiveModelName(),
    configuredModel: getConfiguredModelName(),
    maskedKey: getMaskedApiKey(),
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString(),
    stripeConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')),
    lastQuotaStatus: aiSystemStatus.lastQuotaStatus,
    lastRequestAt: aiSystemStatus.lastRequestAt,
    lastError: aiSystemStatus.lastError,
    lastErrorCode: aiSystemStatus.lastErrorCode,
    retryAfter: aiSystemStatus.retryAfter,
  });
});

app.get('/api/ai/status', (_req: Request, res: Response) => {
  const hasKey = hasGeminiApiKey();
  res.json({
    success: true,
    configured: hasKey,
    hasApiKey: hasKey,
    activeModel: getActiveModelName(),
    model: getActiveModelName(),
    configuredModel: getConfiguredModelName(),
    maskedKey: getMaskedApiKey(),
    lastQuotaStatus: aiSystemStatus.lastQuotaStatus,
    lastRequestAt: aiSystemStatus.lastRequestAt,
    lastError: aiSystemStatus.lastError,
    lastErrorCode: aiSystemStatus.lastErrorCode,
    retryAfter: aiSystemStatus.retryAfter,
    serverTime: new Date().toISOString(),
  });
});

// Test Connection: POST /api/ai/test-connection (Section 9)
app.post('/api/ai/test-connection', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
            canRetry: false,
          })
        );
    }

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const requestedModel =
      req.body && typeof req.body.model === 'string' && req.body.model.trim()
        ? req.body.model.trim()
        : undefined;

    let usedModel = requestedModel || getActiveModelName();
    const result = await executeGeminiWithRetry(
      'test-connection',
      async (client, modelName) => {
        usedModel = modelName;
        const response = await client.models.generateContent({
          model: modelName,
          contents: 'Xin chào, vui lòng phản hồi "OK" nếu hệ thống hoạt động bình thường.',
        });
        return response.text || '';
      },
      {
        customModel: requestedModel,
        strictModel: Boolean(requestedModel),
        requestId: req.requestId,
      }
    );

    aiSystemStatus.lastQuotaStatus = 'normal';
    aiSystemStatus.lastError = null;
    aiSystemStatus.lastErrorCode = null;
    aiSystemStatus.retryAfter = null;

    return res.json(
      buildAiSuccessResponse(
        {
          model: usedModel,
          responseSample: cleanAiResponse(result).slice(0, 100),
          status: 'normal',
        },
        {
          message: 'Kết nối Gemini API thành công! Mô hình hoạt động ổn định.',
          model: usedModel,
          responseSample: cleanAiResponse(result).slice(0, 100),
          status: 'normal',
        }
      )
    );
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota
      ? 'quota_exceeded'
      : parsed.errorCode === 'AI_RATE_LIMITED'
      ? 'rate_limited'
      : parsed.errorCode === 'AI_INVALID_API_KEY'
      ? 'auth_error'
      : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// ====================================================================
// Sync State Endpoint (Ensures server has client subjects, lessons & documents)
// ====================================================================
app.post('/api/sync/state', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { subjects = [], lessons = [], documents = [], deadlines = [], flashcards = [], quizzes = [] } = req.body;

    if (Array.isArray(subjects)) {
      for (const s of subjects) {
        if (s && s.id) {
          const existing = subjectStore.get(s.id);
          const isSharedDemo = DEMO_SHARED_IDS.has(s.id);
          if (existing && existing.ownerId !== userId && !isSharedDemo) continue;
          subjectStore.set(s.id, {
            ...(existing || {}),
            id: s.id,
            ownerId: isSharedDemo ? (existing?.ownerId || 'usr_demo_101') : userId,
            name: s.name || existing?.name || 'Môn học',
            code: s.code ?? existing?.code ?? '',
            description: s.description ?? existing?.description ?? '',
            color: s.color || existing?.color || '#4f46e5',
            lecturer: s.lecturer ?? existing?.lecturer ?? '',
            schedule: s.schedule ?? existing?.schedule ?? '',
            progress: s.progress ?? existing?.progress ?? 0,
            createdAt: existing?.createdAt || s.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (Array.isArray(lessons)) {
      for (const l of lessons) {
        if (l && l.id) {
          const existing = lessonStore.get(l.id);
          const isSharedDemo = DEMO_SHARED_IDS.has(l.id);
          if (existing && existing.ownerId !== userId && !isSharedDemo) continue;
          lessonStore.set(l.id, {
            ...(existing || {}),
            id: l.id,
            ownerId: isSharedDemo ? (existing?.ownerId || 'usr_demo_101') : userId,
            subjectId: l.subjectId || existing?.subjectId || '',
            title: l.title || existing?.title || 'Bài học',
            transcript: l.transcript || existing?.transcript,
            summary: l.summary || existing?.summary,
            keyPoints: l.keyPoints || existing?.keyPoints,
            concepts: l.concepts || existing?.concepts,
            keywords: l.keywords || existing?.keywords,
            mindMap: l.mindMap || existing?.mindMap,
            flashcards: l.flashcards || existing?.flashcards,
            quizQuestions: l.quizQuestions || existing?.quizQuestions,
            exercises: l.exercises || existing?.exercises,
            deadlines: l.deadlines || existing?.deadlines,
            audioUrl: l.audioUrl && !String(l.audioUrl).startsWith('blob:') ? l.audioUrl : existing?.audioUrl,
            storagePath: existing?.storagePath,
            audioFileId: existing?.audioFileId,
            createdAt: existing?.createdAt || l.createdAt || new Date().toISOString(),
            updatedAt: l.updatedAt || new Date().toISOString(),
          });
        }
      }
    }

    if (Array.isArray(documents)) {
      for (const d of documents) {
        if (d && d.id) {
          const existing = documentStore.get(d.id);
          const isSharedDemo = DEMO_SHARED_IDS.has(d.id);
          if (existing && existing.ownerId !== userId && !isSharedDemo) continue;
          documentStore.set(d.id, {
            ...(existing || {}),
            id: d.id,
            ownerId: isSharedDemo ? (existing?.ownerId || 'usr_demo_101') : userId,
            subjectId: d.subjectId || existing?.subjectId || '',
            lessonId: d.lessonId || existing?.lessonId,
            fileName: d.fileName || existing?.fileName || 'document.pdf',
            fileType: d.fileType || existing?.fileType || 'application/pdf',
            fileSize: d.fileSize || existing?.fileSize || 0,
            storagePath: existing?.storagePath || '',
            fileUrl: d.fileUrl && !String(d.fileUrl).startsWith('blob:') ? d.fileUrl : existing?.fileUrl || '',
            extractedText: d.extractedText || existing?.extractedText || '',
            summary: d.summary || existing?.summary || '',
            keyTakeaways: d.keyTakeaways || existing?.keyTakeaways || [],
            summaryStatus: d.summaryStatus || existing?.summaryStatus || (d.summary ? 'completed' : 'pending'),
            summaryCreatedAt: d.summaryCreatedAt || existing?.summaryCreatedAt,
            summaryModel: d.summaryModel || existing?.summaryModel,
            summaryError: d.summaryError || existing?.summaryError,
            summaryVersion: d.summaryVersion || existing?.summaryVersion || 1,
            processingStatus: (d.extractedText || existing?.extractedText) ? 'completed' : 'pending',
            createdAt: existing?.createdAt || d.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (Array.isArray(deadlines)) {
      for (const dl of deadlines) {
        if (dl && dl.id) {
          const existing = deadlinesMap.get(dl.id);
          if (existing && existing.ownerId !== userId) continue;
          deadlinesMap.set(dl.id, {
            ...(existing || {}),
            ...dl,
            ownerId: userId,
            createdAt: existing?.createdAt || dl.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (Array.isArray(flashcards)) {
      for (const fc of flashcards) {
        if (fc && fc.id) {
          const existing = flashcardsMap.get(fc.id);
          if (existing && existing.ownerId !== userId) continue;
          flashcardsMap.set(fc.id, {
            ...(existing || {}),
            ...fc,
            ownerId: userId,
            createdAt: existing?.createdAt || fc.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (Array.isArray(quizzes)) {
      for (const q of quizzes) {
        if (q && q.id) {
          const existing = quizzesMap.get(q.id);
          if (existing && existing.ownerId !== userId) continue;
          quizzesMap.set(q.id, {
            ...(existing || {}),
            ...q,
            ownerId: userId,
            createdAt: existing?.createdAt || q.createdAt || new Date().toISOString(),
          });
        }
      }
    }

    return res.json({ success: true, message: 'Đồng bộ dữ liệu thành công.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Lỗi đồng bộ dữ liệu: ' + err?.message });
  }
});

// POST /api/lessons (Create or register lesson)
app.post('/api/lessons', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const {
    id: requestedId,
    subjectId,
    title = 'Bài học mới',
    transcript = '',
    summary = '',
    keyPoints = [],
    concepts = [],
    keywords = [],
    audioUrl,
    status = 'TRANSCRIBED',
  } = req.body;

  if (requestedId && lessonStore.has(requestedId)) {
    const existing = lessonStore.get(requestedId)!;
    if (existing.ownerId !== userId) {
      return res.status(403).json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền truy cập bài học này.'));
    }
  }

  const id = requestedId || `les_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const cleanAudioUrl = typeof audioUrl === 'string' && !audioUrl.startsWith('blob:') ? audioUrl : undefined;
  const now = new Date().toISOString();
  const newLesson: StoredLesson = {
    id,
    ownerId: userId,
    subjectId: subjectId || '',
    title,
    transcript,
    summary,
    keyPoints,
    concepts,
    keywords,
    audioUrl: cleanAudioUrl,
    status,
    createdAt: now,
    updatedAt: now,
  };
  lessonStore.set(id, newLesson);
  console.log('[LESSON_SAVED]', {
    requestId: req.requestId,
    lessonId: id,
    userId,
    status,
    hasAudioUrl: Boolean(cleanAudioUrl),
    transcriptLength: transcript.length,
  });
  return res.status(201).json(buildAiSuccessResponse({ lesson: newLesson }, { lesson: newLesson }));
});

// GET /api/lessons (List current user's lessons)
app.get('/api/lessons', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const subjectId = req.query.subjectId as string | undefined;
  const lessons = Array.from(lessonStore.values()).filter((l) => {
    if (l.ownerId !== userId) return false;
    if (subjectId && l.subjectId !== subjectId) return false;
    return true;
  });
  return res.json(buildAiSuccessResponse({ lessons }, { lessons }));
});

// GET /api/lessons/:id (Get single lesson with strict ownership verification)
app.get('/api/lessons/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const lessonId = req.params.id;
  const lesson = lessonStore.get(lessonId);
  if (!lesson) {
    return res.status(404).json(buildAiErrorResponse('NOT_FOUND', 'Không tìm thấy bài học.'));
  }
  if (lesson.ownerId !== userId) {
    return res.status(403).json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền truy cập bài học này.'));
  }
  return res.json(buildAiSuccessResponse({ lesson }, { lesson }));
});

// PUT /api/lessons/:id (Update lesson with strict ownership verification)
app.put('/api/lessons/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const lessonId = req.params.id;
  const existing = lessonStore.get(lessonId);
  if (existing && existing.ownerId !== userId) {
    return res.status(403).json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền chỉnh sửa bài học này.'));
  }
  const updates = { ...req.body };
  if (typeof updates.audioUrl === 'string' && updates.audioUrl.startsWith('blob:')) {
    delete updates.audioUrl;
  }
  const updated: StoredLesson = {
    ...(existing || {}),
    ...updates,
    id: lessonId,
    ownerId: userId,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  lessonStore.set(lessonId, updated);
  return res.json(buildAiSuccessResponse({ lesson: updated }, { lesson: updated }));
});

// DELETE /api/lessons/:id (Delete lesson with strict ownership verification)
app.delete('/api/lessons/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const lessonId = req.params.id;
  const existing = lessonStore.get(lessonId);
  if (!existing) {
    return res.status(404).json(buildAiErrorResponse('NOT_FOUND', 'Không tìm thấy bài học.'));
  }
  if (existing.ownerId !== userId) {
    return res.status(403).json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền xóa bài học này.'));
  }
  if (existing.storagePath && fs.existsSync(existing.storagePath)) {
    try {
      fs.unlinkSync(existing.storagePath);
    } catch {}
  }
  lessonStore.delete(lessonId);
  return res.json(buildAiSuccessResponse({ deleted: true, lessonId }, { deleted: true }));
});

// ====================================================================
// Persistent Audio Storage Endpoints (PHẦN 1 & PHẦN 4)
// ====================================================================
const handleAudioUpload = (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để thực hiện tải lên âm thanh.',
      });
    }

    let cleanMime = 'audio/webm';
    let originalName = 'recording.webm';
    let duration = 0;
    let subjectId = (req.body.subjectId as string) || '';
    let lessonId = (req.body.lessonId as string) || '';
    let fileBuffer: Buffer | null = null;
    let targetFileName = '';
    let targetFilePath = '';
    let fileId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (req.file) {
      originalName = req.file.originalname || 'audio.webm';
      cleanMime = req.file.mimetype || 'audio/webm';
      duration = Number(req.body.duration) || 0;

      targetFilePath = req.file.path;
      targetFileName = path.basename(targetFilePath);
      const parsedName = path.parse(targetFileName).name;
      if (parsedName) fileId = parsedName;
      fileBuffer = fs.readFileSync(targetFilePath);
    } else if (req.body.audioData && typeof req.body.audioData === 'string') {
      const {
        audioData,
        mimeType = 'audio/webm',
        fileName = 'recording.webm',
        duration: dur = 0,
      } = req.body;

      let cleanBase64 = audioData.trim();
      cleanMime = (mimeType || 'audio/webm').trim();
      originalName = fileName;
      duration = Number(dur) || 0;

      if (cleanBase64.includes(';base64,')) {
        const parts = cleanBase64.split(';base64,');
        const header = parts[0];
        cleanBase64 = parts.slice(1).join(';base64,');
        const mimeMatch = header.match(/^data:([^;]+)/i);
        if (mimeMatch && mimeMatch[1]) cleanMime = mimeMatch[1].trim();
      } else if (cleanBase64.startsWith('data:')) {
        const commaIdx = cleanBase64.indexOf(',');
        if (commaIdx !== -1) {
          const header = cleanBase64.slice(0, commaIdx);
          cleanBase64 = cleanBase64.slice(commaIdx + 1);
          const mimeMatch = header.match(/^data:([^;]+)/i);
          if (mimeMatch && mimeMatch[1]) cleanMime = mimeMatch[1].trim();
        }
      }

      cleanBase64 = cleanBase64.replace(/\s+/g, '');
      fileBuffer = Buffer.from(cleanBase64, 'base64');

      let extension = '.webm';
      if (cleanMime.includes('mp4')) extension = '.mp4';
      else if (cleanMime.includes('wav')) extension = '.wav';
      else if (cleanMime.includes('mpeg') || cleanMime.includes('mp3')) extension = '.mp3';
      else if (cleanMime.includes('ogg')) extension = '.ogg';
      else if (cleanMime.includes('m4a')) extension = '.m4a';

      targetFileName = `${fileId}${extension}`;
      targetFilePath = path.join(audioUploadDir, targetFileName);
      fs.writeFileSync(targetFilePath, fileBuffer);
    } else {
      return res.status(400).json({
        success: false,
        errorCode: 'NO_AUDIO_FILE',
        message: 'Chưa chọn file âm thanh.',
      });
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      if (targetFilePath && fs.existsSync(targetFilePath)) {
        try { fs.unlinkSync(targetFilePath); } catch {}
      }
      return res.status(400).json({
        success: false,
        errorCode: 'EMPTY_AUDIO_FILE',
        message: 'File âm thanh đang rỗng (0 bytes).',
      });
    }

    // Check size limit (100MB)
    if (fileBuffer.length > 100 * 1024 * 1024) {
      if (targetFilePath && fs.existsSync(targetFilePath)) {
        try { fs.unlinkSync(targetFilePath); } catch {}
      }
      return res.status(400).json({
        success: false,
        errorCode: 'FILE_TOO_LARGE',
        message: 'File âm thanh vượt quá giới hạn 100MB.',
      });
    }

    // MIME type check with extension fallback
    const ext = path.extname(originalName || targetFileName).toLowerCase();
    const validExtensions = ['.webm', '.mp3', '.wav', '.mp4', '.m4a', '.ogg', '.aac', '.mpeg'];
    const validMimes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/aac',
      'video/webm',
      'video/mp4',
    ];

    const isSupportedMime = validMimes.some((vm) => cleanMime.toLowerCase().includes(vm));
    const isSupportedExt = validExtensions.includes(ext);

    if (!isSupportedMime && !isSupportedExt) {
      if (targetFilePath && fs.existsSync(targetFilePath)) {
        try { fs.unlinkSync(targetFilePath); } catch {}
      }
      return res.status(400).json({
        success: false,
        errorCode: 'UNSUPPORTED_AUDIO_TYPE',
        message: 'Định dạng file âm thanh không được hỗ trợ. Vui lòng tải file WebM, MP3, WAV, M4A hoặc OGG.',
      });
    }

    // Check ownership if lessonId is provided
    if (lessonId) {
      const existingLesson = lessonStore.get(lessonId);
      if (existingLesson && existingLesson.ownerId && existingLesson.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          errorCode: 'STORAGE_PERMISSION_DENIED',
          message: 'Bạn không có quyền tải file vào bài học này.',
        });
      }
    }

    cleanMime = cleanMime.split(';')[0].trim().toLowerCase();
    if (cleanMime === 'audio/mpeg') cleanMime = 'audio/mp3';
    if (cleanMime === 'video/webm') cleanMime = 'audio/webm';
    if (cleanMime === 'video/mp4') cleanMime = 'audio/mp4';

    const metadata: AudioMetadata = {
      fileId,
      originalName,
      mimeType: cleanMime,
      size: fileBuffer.length,
      duration,
      subjectId,
      lessonId,
      userId,
      filePath: targetFilePath,
      createdAt: new Date().toISOString(),
    };

    audioMetadataStore.set(fileId, metadata);
    const audioUrl = `/api/audio/${fileId}`;

    // Update or create lesson metadata in database/memory
    if (lessonId) {
      if (lessonStore.has(lessonId)) {
        const l = lessonStore.get(lessonId)!;
        l.audioUrl = audioUrl;
        l.storagePath = targetFilePath;
        l.audioFileId = fileId;
        l.audioMimeType = cleanMime;
        l.audioSize = fileBuffer.length;
        if (duration) l.audioDuration = duration;
        l.updatedAt = new Date().toISOString();
        lessonStore.set(lessonId, l);
      } else {
        lessonStore.set(lessonId, {
          id: lessonId,
          ownerId: userId,
          subjectId: subjectId || 'sub_web_01',
          title: originalName.replace(/\.[^/.]+$/, '') || 'Bài giảng đã ghi âm',
          audioUrl,
          storagePath: targetFilePath,
          audioFileId: fileId,
          audioMimeType: cleanMime,
          audioSize: fileBuffer.length,
          audioDuration: duration || 0,
          transcriptionStatus: 'uploaded',
          analysisStatus: 'idle',
          sourceType: 'audio',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Safe logging (Section 9 & 11) - never logs API key, token, or sensitive data
    console.log('[AUDIO UPLOAD]', {
      'audio received': true,
      'file name': originalName,
      'file size': fileBuffer.length,
      'mime type': cleanMime,
      'storage upload': 'success',
      'ai request': 'not sent',
    });

    return res.json({
      success: true,
      fileId,
      audioUrl,
      storagePath: targetFilePath,
      fileName: originalName,
      mimeType: cleanMime,
      fileSize: metadata.size,
      lessonId: lessonId || undefined,
      message: 'Đã tải file âm thanh lên thành công.',
    });
  } catch (err: any) {
    console.error('[AUDIO UPLOAD FAILED]', {
      'audio received': false,
      'file name': 'unknown',
      'file size': 0,
      'mime type': 'unknown',
      'storage upload': 'failed',
      'ai request': 'not sent',
      'error': err?.message || 'Lỗi lưu trữ',
    });
    return res.status(500).json({
      success: false,
      errorCode: 'STORAGE_UPLOAD_FAILED',
      message: 'Không thể tải file âm thanh lên: ' + (err?.message || 'Lỗi lưu trữ'),
    });
  }
};

app.post('/api/upload/audio', authenticateUser, audioUploadMiddleware, handleAudioUpload);
app.post('/api/audio/upload', authenticateUser, audioUploadMiddleware, handleAudioUpload);

// Stream Audio with HTTP Range Request Support
app.get('/api/audio/:fileId', (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    let metadata = audioMetadataStore.get(fileId);
    let filePath = metadata?.filePath;

    if (!filePath || !fs.existsSync(filePath)) {
      const files = fs.readdirSync(audioUploadDir);
      const matched = files.find((f) => f.startsWith(fileId));
      if (matched) {
        filePath = path.join(audioUploadDir, matched);
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        errorCode: 'AUDIO_NOT_FOUND',
        message: 'Không tìm thấy file âm thanh trên hệ thống lưu trữ.',
      });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mime =
      metadata?.mimeType ||
      (filePath.endsWith('.mp4')
        ? 'audio/mp4'
        : filePath.endsWith('.wav')
        ? 'audio/wav'
        : filePath.endsWith('.mp3')
        ? 'audio/mpeg'
        : filePath.endsWith('.m4a')
        ? 'audio/m4a'
        : filePath.endsWith('.ogg')
        ? 'audio/ogg'
        : 'audio/webm');

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mime,
      });

      fileStream.pipe(res);
      fileStream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mime,
        'Accept-Ranges': 'bytes',
      });
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      fileStream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
    }
  } catch (err: any) {
    console.error('Lỗi khi phát file âm thanh:', err);
    res.status(500).json({ success: false, message: 'Lỗi phát file âm thanh.' });
  }
});

// Delete audio file
app.delete('/api/audio/:fileId', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const metadata = audioMetadataStore.get(fileId);

    if (metadata && metadata.userId && metadata.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa file âm thanh này.' });
    }

    if (metadata && fs.existsSync(metadata.filePath)) {
      try {
        fs.unlinkSync(metadata.filePath);
      } catch (e) {
        console.warn('Lỗi khi xóa file disk:', e);
      }
      audioMetadataStore.delete(fileId);
    } else {
      const files = fs.readdirSync(audioUploadDir);
      const matched = files.find((f) => f.startsWith(fileId));
      if (matched) {
        try {
          fs.unlinkSync(path.join(audioUploadDir, matched));
        } catch (e) {
          console.warn('Lỗi khi xóa file disk:', e);
        }
      }
    }

    return res.json({ success: true, message: 'Đã xóa file âm thanh thành công.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Không thể xóa file âm thanh: ' + err?.message });
  }
});

// Delete audio files by subject
app.post('/api/audio/delete-by-subject', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Thiếu subjectId' });
    }

    let count = 0;
    for (const [fId, meta] of audioMetadataStore.entries()) {
      if (meta.subjectId === subjectId) {
        if (meta.userId && meta.userId !== req.userId) continue;
        if (fs.existsSync(meta.filePath)) {
          try {
            fs.unlinkSync(meta.filePath);
          } catch {}
        }
        audioMetadataStore.delete(fId);
        count++;
      }
    }

    return res.json({ success: true, message: `Đã xóa ${count} file âm thanh của môn học.`, deletedCount: count });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa file âm thanh theo môn học: ' + err?.message });
  }
});

// ====================================================================
// AI Audio Transcription: POST /api/ai/transcribe
// Accepts multipart/form-data ('file' or 'audio') OR stored lessonId/fileId OR base64 audioData
// Saves audio file to server Storage, sends real audio to Gemini, persists transcript + audioUrl to lesson
// ====================================================================
app.post(
  '/api/ai/transcribe',
  memoryAudioUploadMiddleware,
  authenticateUser,
  checkAiQuota,
  async (req: AuthenticatedRequest, res: Response) => {
    let savedDiskFilePath = '';
    let savedFileId = '';
    let savedAudioUrl = '';
    let targetLessonId = (req.body.lessonId || '').trim();
    const userId = req.userId!;

    try {
      const limitCheck = checkUserActionLimit(userId, 'transcription');
      if (!limitCheck.allowed) {
        return res
          .status(429)
          .json(
            buildAiErrorResponse('AI_QUOTA_EXCEEDED', limitCheck.message, {
              canRetry: false,
            })
          );
      }

      const { fileId, subjectName = '', subjectId = '', title = '' } = req.body;

      if (typeof req.body.audioUrl === 'string' && req.body.audioUrl.startsWith('blob:') && !req.file && !req.body.audioData && !fileId) {
        return res
          .status(400)
          .json(
            buildAiErrorResponse(
              'AUDIO_FILE_MISSING',
              'Không thể xử lý đường dẫn tạm thời blob:http://... Vui lòng tải file âm thanh thật lên máy chủ.'
            )
          );
      }

      if (!req.file && !fileId && !targetLessonId && !req.body.audioData) {
        return res
          .status(400)
          .json(
            buildAiErrorResponse(
              'AUDIO_FILE_MISSING',
              'Không tìm thấy dữ liệu âm thanh hợp lệ để phân tích.',
              { warnings: ['Request thiếu dữ liệu audio.'] }
            )
          );
      }

      if (req.file && req.file.size === 0) {
        return res
          .status(400)
          .json(
            buildAiErrorResponse(
              'AUDIO_FILE_MISSING',
              'File âm thanh rỗng (0 bytes). Hãy kiểm tra microphone và nói to hơn.',
              { warnings: ['Dung lượng file audio bằng 0 bytes.'] }
            )
          );
      }

      if (targetLessonId) {
        const existingLesson = lessonStore.get(targetLessonId);
        if (existingLesson && existingLesson.ownerId !== userId) {
          return res
            .status(403)
            .json(
              buildAiErrorResponse(
                'FORBIDDEN',
                'Bạn không có quyền truy cập bài học này.'
              )
            );
        }
      }

      const supportedAudioMimes = [
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/ogg',
        'audio/m4a',
        'audio/x-m4a',
        'audio/aac',
        'video/webm',
        'video/mp4',
      ];
      const validExts = ['.webm', '.mp3', '.wav', '.mp4', '.m4a', '.ogg', '.aac', '.mpeg'];

      let cleanBase64 = '';
      let cleanMimeType = (req.body.mimeType || 'audio/webm').trim();
      let fileBuffer: Buffer | null = null;
      let originalFileName = 'lesson-recording.webm';

      if (req.file) {
        originalFileName = req.file.originalname || 'lesson-recording.webm';
        const rawMime = (req.file.mimetype || 'audio/webm').split(';')[0].trim().toLowerCase();
        const extName = path.extname(originalFileName).toLowerCase();

        if (!supportedAudioMimes.includes(rawMime) && !rawMime.startsWith('audio/') && !validExts.includes(extName)) {
          return res
            .status(400)
            .json(
              buildAiErrorResponse(
                'UNSUPPORTED_AUDIO_FORMAT',
                'Định dạng âm thanh không hợp lệ. Vui lòng sử dụng file WebM, MP3, WAV, M4A hoặc OGG.'
              )
            );
        }

        fileBuffer = req.file.buffer;
        cleanBase64 = fileBuffer.toString('base64');
        cleanMimeType = rawMime;

        // Save physical audio file to server Storage immediately
        savedFileId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const ext = cleanMimeType.includes('wav')
          ? 'wav'
          : cleanMimeType.includes('mpeg') || cleanMimeType.includes('mp3')
          ? 'mp3'
          : cleanMimeType.includes('mp4') || cleanMimeType.includes('m4a')
          ? 'm4a'
          : cleanMimeType.includes('ogg')
          ? 'ogg'
          : 'webm';
        savedDiskFilePath = path.join(audioUploadDir, `${savedFileId}.${ext}`);
        fs.writeFileSync(savedDiskFilePath, fileBuffer);
        savedAudioUrl = `/api/audio/${savedFileId}`;

        audioMetadataStore.set(savedFileId, {
          fileId: savedFileId,
          userId,
          lessonId: targetLessonId || undefined,
          subjectId: subjectId || undefined,
          originalName: originalFileName,
          mimeType: cleanMimeType,
          size: fileBuffer.length,
          duration: Number(req.body.duration) || 0,
          filePath: savedDiskFilePath,
          createdAt: new Date().toISOString(),
        });
      } else if (fileId || targetLessonId) {
        const lesson = targetLessonId ? lessonStore.get(targetLessonId) : null;
        let resolvedFileId = fileId || lesson?.audioFileId || (lesson?.audioUrl ? lesson.audioUrl.split('/api/audio/')[1]?.split('?')[0] : '');
        let resolvedPath = lesson?.storagePath || '';
        let resolvedMime = lesson?.audioMimeType || 'audio/webm';

        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
          if (resolvedFileId) {
            const meta = audioMetadataStore.get(resolvedFileId);
            if (meta && fs.existsSync(meta.filePath)) {
              if (meta.userId && meta.userId !== userId) {
                return res.status(403).json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền truy cập file âm thanh này.'));
              }
              resolvedPath = meta.filePath;
              resolvedMime = meta.mimeType;
            } else {
              const files = fs.readdirSync(audioUploadDir);
              const matched = files.find((f) => f.startsWith(resolvedFileId));
              if (matched) {
                resolvedPath = path.join(audioUploadDir, matched);
                resolvedMime = matched.endsWith('.mp3')
                  ? 'audio/mpeg'
                  : matched.endsWith('.wav')
                  ? 'audio/wav'
                  : matched.endsWith('.mp4') || matched.endsWith('.m4a')
                  ? 'audio/mp4'
                  : 'audio/webm';
              }
            }
          }
        }

        if (resolvedPath && fs.existsSync(resolvedPath)) {
          fileBuffer = fs.readFileSync(resolvedPath);
          cleanBase64 = fileBuffer.toString('base64');
          cleanMimeType = resolvedMime;
          savedDiskFilePath = resolvedPath;
          savedFileId = resolvedFileId || path.parse(path.basename(resolvedPath)).name;
          savedAudioUrl = lesson?.audioUrl || `/api/audio/${savedFileId}`;
          originalFileName = path.basename(resolvedPath);
        } else if (!req.body.audioData) {
          return res
            .status(400)
            .json(
              buildAiErrorResponse(
                'AUDIO_FILE_MISSING',
                'Không tìm thấy file âm thanh đã lưu trên máy chủ để nhận diện.'
              )
            );
        }
      }

      if (!cleanBase64 && req.body.audioData && typeof req.body.audioData === 'string') {
        cleanBase64 = req.body.audioData.trim();
        if (cleanBase64.startsWith('blob:')) {
          return res
            .status(400)
            .json(
              buildAiErrorResponse(
                'AUDIO_FILE_MISSING',
                'Không thể xử lý đường dẫn tạm thời blob:http://... Vui lòng tải file âm thanh thật lên máy chủ.'
              )
            );
        }
        if (cleanBase64.includes(';base64,')) {
          const parts = cleanBase64.split(';base64,');
          const header = parts[0];
          cleanBase64 = parts.slice(1).join(';base64,');
          const mimeMatch = header.match(/^data:([^;]+)/i);
          if (mimeMatch && mimeMatch[1]) cleanMimeType = mimeMatch[1].trim();
        } else if (cleanBase64.startsWith('data:')) {
          const commaIdx = cleanBase64.indexOf(',');
          if (commaIdx !== -1) {
            const header = cleanBase64.slice(0, commaIdx);
            cleanBase64 = cleanBase64.slice(commaIdx + 1);
            const mimeMatch = header.match(/^data:([^;]+)/i);
            if (mimeMatch && mimeMatch[1]) cleanMimeType = mimeMatch[1].trim();
          }
        }
        cleanBase64 = cleanBase64.replace(/\s+/g, '');
        if (cleanBase64.length >= 50) {
          fileBuffer = Buffer.from(cleanBase64, 'base64');
          savedFileId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const ext = cleanMimeType.includes('wav') ? 'wav' : cleanMimeType.includes('mp3') || cleanMimeType.includes('mpeg') ? 'mp3' : 'webm';
          savedDiskFilePath = path.join(audioUploadDir, `${savedFileId}.${ext}`);
          fs.writeFileSync(savedDiskFilePath, fileBuffer);
          savedAudioUrl = `/api/audio/${savedFileId}`;
          audioMetadataStore.set(savedFileId, {
            fileId: savedFileId,
            userId,
            lessonId: targetLessonId || undefined,
            subjectId: subjectId || undefined,
            originalName: originalFileName,
            mimeType: cleanMimeType,
            size: fileBuffer.length,
            duration: Number(req.body.duration) || 0,
            filePath: savedDiskFilePath,
            createdAt: new Date().toISOString(),
          });
        }
      }

      cleanMimeType = cleanMimeType.split(';')[0].trim().toLowerCase();
      if (cleanMimeType === 'audio/mpeg') cleanMimeType = 'audio/mp3';
      if (cleanMimeType === 'audio/m4a' || cleanMimeType === 'audio/x-m4a') cleanMimeType = 'audio/mp4';
      if (cleanMimeType === 'video/webm') cleanMimeType = 'audio/webm';
      if (cleanMimeType === 'video/mp4') cleanMimeType = 'audio/mp4';

      const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
      if (!supportedTypes.includes(cleanMimeType) && !cleanMimeType.startsWith('audio/')) {
        cleanMimeType = 'audio/webm';
      }

      if (!cleanBase64 || cleanBase64.length < 50) {
        if (savedDiskFilePath && fs.existsSync(savedDiskFilePath)) {
          try { fs.unlinkSync(savedDiskFilePath); } catch {}
        }
        return res
          .status(400)
          .json(
            buildAiErrorResponse(
              'AUDIO_FILE_MISSING',
              'Không tìm thấy dữ liệu âm thanh hợp lệ để phân tích.',
              { warnings: ['Âm thanh quá nhỏ hoặc rỗng'] }
            )
          );
      }

      // Ensure lesson record exists or is updated with real audioUrl and TRANSCRIBING status
      if (!targetLessonId) {
        targetLessonId = `les_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      }
      try {
        const existingLesson = lessonStore.get(targetLessonId);
        const now = new Date().toISOString();
        lessonStore.set(targetLessonId, {
          ...(existingLesson || {}),
          id: targetLessonId,
          ownerId: userId,
          subjectId: subjectId || existingLesson?.subjectId || 'sub_web_01',
          title: (title || existingLesson?.title || `Bài giảng ngày ${new Date().toLocaleDateString('vi-VN')}`).trim(),
          audioUrl: savedAudioUrl || existingLesson?.audioUrl,
          storagePath: savedDiskFilePath || existingLesson?.storagePath,
          audioFileId: savedFileId || existingLesson?.audioFileId,
          audioMimeType: cleanMimeType,
          audioSize: fileBuffer ? fileBuffer.length : existingLesson?.audioSize,
          audioDuration: Number(req.body.duration) || existingLesson?.audioDuration || 0,
          status: 'TRANSCRIBING',
          transcriptionStatus: 'processing',
          sourceType: 'audio',
          createdAt: existingLesson?.createdAt || now,
          updatedAt: now,
        });
      } catch (dbWriteErr: any) {
        // Rollback uploaded file if DB save fails (Section 8)
        if (req.file && savedDiskFilePath && fs.existsSync(savedDiskFilePath)) {
          try { fs.unlinkSync(savedDiskFilePath); } catch {}
          if (savedFileId) audioMetadataStore.delete(savedFileId);
        }
        throw dbWriteErr;
      }

      console.log('[AI_TRANSCRIBE_REQUEST]', {
        requestId: req.requestId,
        userId,
        lessonId: targetLessonId,
        audioReceived: true,
        fileName: originalFileName,
        fileSize: fileBuffer ? fileBuffer.length : cleanBase64.length,
        mimeType: cleanMimeType,
        storageUpload: savedAudioUrl ? 'success' : 'reused',
        audioUrl: savedAudioUrl,
      });

      const ai = getGeminiClient();
      if (!ai) {
        const l = lessonStore.get(targetLessonId);
        if (l) {
          l.status = 'FAILED';
          l.transcriptionStatus = 'failed';
          l.analysisError = GEMINI_MISSING_KEY_MESSAGE;
          lessonStore.set(targetLessonId, l);
        }
        return res
          .status(503)
          .json(
            buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
              canRetry: false,
              fileSaved: Boolean(savedAudioUrl),
              audioUrl: savedAudioUrl,
              fileId: savedFileId,
              lessonId: targetLessonId,
            })
          );
      }

      const transcribePrompt = `Hãy chuyển file âm thanh bài giảng này thành văn bản tiếng Việt chi tiết.

Yêu cầu:
- Ghi lại đầy đủ và trung thực nội dung giọng nói nghe được trong file âm thanh.
- Không tự bịa đặt nội dung bên ngoài.
- Nếu âm thanh im lặng hoặc không nghe rõ, ghi rõ [Không phát hiện giọng nói rõ ràng trong bản ghi âm].
- Giữ nguyên thuật ngữ chuyên ngành.
- Không sử dụng ký hiệu Markdown như *, $, ---.`;

      aiSystemStatus.lastRequestAt = new Date().toISOString();

      const rawTranscript = await executeGeminiWithRetry(
        'transcribe',
        async (client, modelName) => {
          const response = await client.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMimeType,
                      data: cleanBase64,
                    },
                  },
                  { text: transcribePrompt },
                ],
              },
            ],
          });
          const text = response.text || '';
          if (!text.trim()) {
            const emptyErr = new Error('AI returned empty transcript') as Error & { code?: string };
            emptyErr.code = 'AI_EMPTY_RESPONSE';
            throw emptyErr;
          }
          return text;
        },
        {
          customModel: getConfiguredTranscribeModelName(),
          requestId: req.requestId,
        }
      );

      aiSystemStatus.lastQuotaStatus = 'normal';
      aiSystemStatus.lastError = null;

      const cleanedTranscript = cleanAiResponse(rawTranscript);

      if (!cleanedTranscript || cleanedTranscript.trim().length === 0) {
        const l = lessonStore.get(targetLessonId);
        if (l) {
          l.status = 'FAILED';
          l.transcriptionStatus = 'failed';
          lessonStore.set(targetLessonId, l);
        }
        return res
          .status(502)
          .json(
            buildAiErrorResponse(
              'AI_EMPTY_RESPONSE',
              'AI không nhận diện được nội dung trong file ghi âm.',
              {
                warnings: ['Âm thanh quá nhỏ', 'File có nhiều tiếng ồn'],
                fileSaved: Boolean(savedAudioUrl),
                audioUrl: savedAudioUrl,
                fileId: savedFileId,
                lessonId: targetLessonId,
              }
            )
          );
      }

      if (targetLessonId && lessonStore.has(targetLessonId)) {
        const l = lessonStore.get(targetLessonId)!;
        if (l.ownerId === userId) {
          l.transcript = cleanedTranscript;
          l.audioUrl = savedAudioUrl || l.audioUrl;
          l.status = 'TRANSCRIBED';
          l.transcriptionStatus = 'completed';
          l.updatedAt = new Date().toISOString();
          lessonStore.set(targetLessonId, l);
        }
      }

      console.log('[AI_TRANSCRIBE_COMPLETE]', {
        requestId: req.requestId,
        lessonId: targetLessonId,
        audioUrl: savedAudioUrl,
        transcriptSaved: true,
        transcriptLength: cleanedTranscript.length,
        status: 'TRANSCRIBED',
      });

      return res.json(
        buildAiSuccessResponse(
          {
            transcript: cleanedTranscript,
            audioUrl: savedAudioUrl,
            fileId: savedFileId,
            lessonId: targetLessonId,
            status: 'TRANSCRIBED',
            language: 'vi',
            warnings: [],
          },
          {
            isRealAi: true,
            audioUrl: savedAudioUrl,
            fileId: savedFileId,
            lessonId: targetLessonId,
            status: 'TRANSCRIBED',
          }
        )
      );
    } catch (err: any) {
      const parsed = parseGeminiError(err);
      aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota
        ? 'quota_exceeded'
        : parsed.errorCode === 'AI_RATE_LIMITED'
        ? 'rate_limited'
        : parsed.errorCode === 'AI_INVALID_API_KEY'
        ? 'auth_error'
        : 'server_error';
      aiSystemStatus.lastError = parsed.message;
      aiSystemStatus.lastErrorCode = parsed.errorCode;
      aiSystemStatus.retryAfter = parsed.retryAfter || null;

      if (targetLessonId && lessonStore.has(targetLessonId)) {
        const l = lessonStore.get(targetLessonId)!;
        if (l.ownerId === userId) {
          l.status = parsed.isDailyQuota ? 'AI_QUOTA_EXCEEDED' : 'FAILED';
          l.transcriptionStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'failed';
          l.analysisError = parsed.message;
          l.updatedAt = new Date().toISOString();
          lessonStore.set(targetLessonId, l);
        }
      }

      return res.status(parsed.httpStatus || 500).json(
        buildAiErrorResponse(parsed.errorCode, parsed.message, {
          retryAfter: parsed.retryAfter,
          canRetry: parsed.canRetry,
          fileSaved: Boolean(savedAudioUrl),
          audioUrl: savedAudioUrl,
          fileId: savedFileId,
          lessonId: targetLessonId,
        })
      );
    }
  }
);

// ====================================================================
// AI Complete Audio Analysis: POST /api/ai/analyze-audio
// Receives either:
// 1. Real audio file in FormData (field 'audio')
// 2. OR lessonId/fileId to load audio directly from server Storage
// Returns transcript, summary, keyPoints, keywords, flashcards, quizQuestions, exercises, deadlines
// ====================================================================
app.post(
  '/api/ai/analyze-audio',
  memoryAudioUploadMiddleware,
  authenticateUser,
  checkAiQuota,
  async (req: AuthenticatedRequest, res: Response) => {
    let targetFileName = 'recording.webm';
    let fileBuffer: Buffer | null = null;
    let cleanMime = 'audio/webm';
    let diskFilePath = '';
    let fileId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let audioUrl = '';
    let targetLessonId = req.body.lessonId || `les_${Date.now()}`;
    const userId = req.userId!;

    try {
      // 1. Check if real file is provided in FormData
      if (req.file) {
        if (req.file.size === 0) {
          console.error('[AI AUDIO ANALYSIS FAILED]', {
            'audio received': false,
            'file name': req.file.originalname || 'unknown',
            'file size': 0,
            'mime type': req.file.mimetype || 'unknown',
            'storage upload': 'failed',
            'ai request': 'not sent',
          });
          return res.status(400).json({
            success: false,
            errorCode: 'EMPTY_AUDIO_FILE',
            message: 'File ghi âm đang rỗng (0 bytes).',
          });
        }

        // Validate MIME type
        const rawMime = (req.file.mimetype || 'audio/webm').split(';')[0].trim().toLowerCase();
        const supportedMimes = [
          'audio/webm',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/wave',
          'audio/x-wav',
          'audio/mp4',
          'audio/m4a',
          'audio/x-m4a',
          'audio/ogg',
          'audio/aac',
        ];

        cleanMime = rawMime;
        if (cleanMime === 'audio/mp3') cleanMime = 'audio/mpeg';
        if (cleanMime === 'audio/m4a' || cleanMime === 'audio/x-m4a') cleanMime = 'audio/mp4';

        const extName = path.extname(req.file.originalname || '').toLowerCase();
        const validExts = ['.webm', '.mp3', '.wav', '.mp4', '.m4a', '.ogg', '.aac', '.mpeg'];

        if (!supportedMimes.includes(rawMime) && !rawMime.startsWith('audio/') && !validExts.includes(extName)) {
          console.error('[AI AUDIO ANALYSIS FAILED]', {
            'audio received': false,
            'file name': req.file.originalname,
            'file size': req.file.size,
            'mime type': rawMime,
            'storage upload': 'failed',
            'ai request': 'not sent',
          });
          return res.status(400).json({
            success: false,
            errorCode: 'UNSUPPORTED_AUDIO_FORMAT',
            message: 'Định dạng âm thanh chưa được hỗ trợ. Hãy sử dụng MP3, WAV, M4A hoặc WebM.',
          });
        }

        // Save real audio file to disk Storage immediately
        fileBuffer = req.file.buffer;
        targetFileName = req.file.originalname || `recording_${Date.now()}.${cleanMime.includes('wav') ? 'wav' : cleanMime.includes('mp3') ? 'mp3' : 'webm'}`;
        let ext = cleanMime.includes('wav')
          ? 'wav'
          : cleanMime.includes('mpeg') || cleanMime.includes('mp3')
          ? 'mp3'
          : cleanMime.includes('mp4')
          ? 'm4a'
          : cleanMime.includes('ogg')
          ? 'ogg'
          : 'webm';
        const diskFileName = `${fileId}.${ext}`;
        diskFilePath = path.join(audioUploadDir, diskFileName);

        fs.writeFileSync(diskFilePath, fileBuffer);
        audioUrl = `/api/audio/${fileId}`;

        audioMetadataStore.set(fileId, {
          fileId,
          userId,
          lessonId: targetLessonId,
          subjectId: req.body.subjectId || undefined,
          originalName: targetFileName,
          mimeType: cleanMime,
          size: fileBuffer.length,
          duration: Number(req.body.duration) || 0,
          filePath: diskFilePath,
          createdAt: new Date().toISOString(),
        });
      } else if (req.body.lessonId || req.body.fileId) {
        // Case 2: Load audio directly from Server Storage via lessonId or fileId
        const lesson = req.body.lessonId ? lessonStore.get(req.body.lessonId) : null;
        let targetFId = req.body.fileId || lesson?.audioFileId || (lesson?.audioUrl ? lesson.audioUrl.split('/api/audio/')[1]?.split('?')[0] : null);

        if (!targetFId && req.body.lessonId) {
          for (const [metaId, meta] of audioMetadataStore.entries()) {
            if (meta.lessonId === req.body.lessonId) {
              targetFId = metaId;
              break;
            }
          }
        }

        let resolvedPath = lesson?.storagePath;
        let resolvedMime = lesson?.audioMimeType || 'audio/webm';

        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
          if (targetFId) {
            const meta = audioMetadataStore.get(targetFId);
            if (meta && fs.existsSync(meta.filePath)) {
              resolvedPath = meta.filePath;
              resolvedMime = meta.mimeType;
            } else {
              const files = fs.readdirSync(audioUploadDir);
              const matched = files.find((f) => f.startsWith(targetFId));
              if (matched) {
                resolvedPath = path.join(audioUploadDir, matched);
                resolvedMime = matched.endsWith('.mp3')
                  ? 'audio/mpeg'
                  : matched.endsWith('.wav')
                  ? 'audio/wav'
                  : matched.endsWith('.mp4')
                  ? 'audio/mp4'
                  : 'audio/webm';
              }
            }
          }
        }

        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
          const isBlobUrl = typeof req.body.audioUrl === 'string' && req.body.audioUrl.startsWith('blob:');
          console.error('[AI AUDIO ANALYSIS FAILED]', {
            'audio received': false,
            'file name': 'none',
            'file size': 0,
            'mime type': 'none',
            'storage upload': 'failed',
            'ai request': 'not sent',
            'reason': isBlobUrl ? 'blob URL cannot be loaded by server' : 'file not found in storage',
          });

          return res.status(400).json({
            success: false,
            errorCode: isBlobUrl ? 'BLOB_URL_NOT_SUPPORTED' : 'NO_AUDIO_FILE',
            message: isBlobUrl
              ? 'Đường dẫn dạng blob:http://... chỉ tồn tại trong bộ nhớ trình duyệt client. Request AI phải có file audio thật trong FormData hoặc lessonId để backend tải audio thật từ Storage.'
              : 'Không tìm thấy file âm thanh thật trong kho lưu trữ cho bài học này. Vui lòng tải file audio lên.',
          });
        }

        fileBuffer = fs.readFileSync(resolvedPath);
        diskFilePath = resolvedPath;
        targetFileName = path.basename(resolvedPath);
        cleanMime = resolvedMime;
        fileId = targetFId || path.parse(targetFileName).name;
        audioUrl = lesson?.audioUrl || `/api/audio/${fileId}`;
      } else {
        const isBlobUrl = typeof req.body.audioUrl === 'string' && req.body.audioUrl.startsWith('blob:');
        console.error('[AI AUDIO ANALYSIS FAILED]', {
          'audio received': false,
          'file name': 'none',
          'file size': 0,
          'mime type': 'none',
          'storage upload': 'failed',
          'ai request': 'not sent',
        });

        return res.status(400).json({
          success: false,
          errorCode: 'NO_AUDIO_FILE',
          message: isBlobUrl
            ? 'Đường dẫn dạng blob:http://... chỉ là tạm thời trong trình duyệt. Vui lòng gửi file audio thật qua FormData.'
            : 'Chưa có file ghi âm hợp lệ trong yêu cầu.',
        });
      }

      // Safe logging (Section 9 & 11) - strictly no API keys, tokens or secrets
      console.log('[AI AUDIO ANALYSIS]', {
        'audio received': true,
        'file name': targetFileName,
        'file size': fileBuffer.length,
        'mime type': cleanMime,
        'storage upload': 'success',
        'ai request': 'sent',
      });

      const subjectId = req.body.subjectId || '';
      const subjectName = req.body.subjectName || (subjectStore.get(subjectId)?.name || 'Môn học');
      const lessonTitle = (req.body.lessonTitle || req.body.title || `Bài giảng ngày ${new Date().toLocaleDateString('vi-VN')}`).trim();

      // Ensure lesson exists in store with uploaded audio metadata & verify ownership
      let lesson = lessonStore.get(targetLessonId);
      if (lesson && lesson.ownerId !== userId) {
        return res.status(403).json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền truy cập bài học này.'));
      }
      if (!lesson) {
        lesson = {
          id: targetLessonId,
          ownerId: userId,
          subjectId,
          title: lessonTitle,
          audioUrl,
          storagePath: diskFilePath,
          audioFileId: fileId,
          audioMimeType: cleanMime,
          audioSize: fileBuffer.length,
          audioDuration: Number(req.body.duration) || 0,
          status: 'GENERATING_LESSON',
          transcriptionStatus: 'uploaded',
          analysisStatus: 'analyzing',
          sourceType: 'audio',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        lessonStore.set(targetLessonId, lesson);
      } else {
        lesson.audioUrl = audioUrl;
        lesson.storagePath = diskFilePath;
        lesson.audioFileId = fileId;
        lesson.audioMimeType = cleanMime;
        lesson.audioSize = fileBuffer.length;
        lesson.status = 'GENERATING_LESSON';
        lesson.analysisStatus = 'analyzing';
        lesson.updatedAt = new Date().toISOString();
        lessonStore.set(targetLessonId, lesson);
      }

      // Send REAL audio data to Gemini API
      const ai = getGeminiClient();
      if (!ai) {
        lesson.analysisStatus = 'failed';
        lesson.analysisError = GEMINI_MISSING_KEY_MESSAGE;
        lessonStore.set(targetLessonId, lesson);

        return res.status(500).json({
          success: false,
          errorCode: 'GEMINI_API_KEY_MISSING',
          message: GEMINI_MISSING_KEY_MESSAGE,
          canRetry: false,
          audioUrl,
          storagePath: diskFilePath,
          fileSaved: true,
          lessonId: targetLessonId,
        });
      }

      const base64Audio = fileBuffer.toString('base64');

      const analyzePrompt = `Bạn là trợ lý AI học tập cao cấp StudyMind AI cho sinh viên Việt Nam.
Hãy phân tích file âm thanh bài giảng này một cách toàn diện, chi tiết và trung thực với lời giảng.
Môn học: ${subjectName}
Tiêu đề: ${lessonTitle}

Yêu cầu thực hiện:
1. Chuyển giọng nói thành transcript tiếng Việt chi tiết, trung thực. Không tự bịa nội dung. Nếu không nghe rõ, ghi [không nghe rõ]. Giữ nguyên các thuật ngữ chuyên ngành.
2. Tạo bản tóm tắt bài giảng (summary) súc tích từ 5-8 câu.
3. Trích xuất các ý chính (keyPoints) gồm "title", "content", "importance" ('high'|'medium'|'low').
4. Trích xuất danh sách từ khóa quan trọng (keywords).
5. Tạo 4-6 thẻ ghi nhớ (flashcards) gồm "front", "back", "difficulty" ('easy'|'medium'|'hard').
6. Tạo 3-4 câu hỏi trắc nghiệm ôn tập (quizQuestions) gồm "question", "options" (mảng 4 lựa chọn), "correctAnswer" (chỉ số 0-3), "explanation" (giải thích).
7. Tạo 2-3 bài tập tự luận hoặc câu hỏi ứng dụng thực tế (exercises) gồm "question" và "answerGuide" (hướng dẫn trả lời).
8. Nhận diện các deadline (deadlines) nếu trong bài giảng có đề cập đến hạn nộp bài tập, thi cử, thuyết trình (gồm "title", "dueDate" YYYY-MM-DD, "priority" 'high'|'medium'|'low'). Nếu không có deadline nào được giảng viên nhắc tới, để mảng rỗng [].
9. Quy định định dạng bắt buộc: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Tuyệt đối KHÔNG sử dụng ký hiệu Markdown như dấu sao (*), dấu đô la ($) làm delimiter công thức hoặc dòng gạch ngang (---, ***).

Yêu cầu định dạng JSON chính xác:
{
  "transcript": "Nội dung lời giảng...",
  "summary": "Tóm tắt bài giảng...",
  "keyPoints": [
    {
      "title": "Tên ý chính",
      "content": "Giải thích chi tiết",
      "importance": "high"
    }
  ],
  "keywords": ["Từ khóa 1", "Từ khóa 2"],
  "flashcards": [
    {
      "front": "Câu hỏi flashcard?",
      "back": "Nội dung trả lời",
      "difficulty": "medium"
    }
  ],
  "quizQuestions": [
    {
      "question": "Câu hỏi trắc nghiệm?",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correctAnswer": 0,
      "explanation": "Giải thích vì sao đúng"
    }
  ],
  "exercises": [
    {
      "question": "Câu hỏi bài tập ứng dụng?",
      "answerGuide": "Hướng dẫn giải chi tiết"
    }
  ],
  "deadlines": [],
  "warnings": []
}`;

      aiSystemStatus.lastRequestAt = new Date().toISOString();

      const aiResponse = await executeGeminiWithRetry('analyze-audio', async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: base64Audio,
                  },
                },
                { text: analyzePrompt },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });
        return safeParseJson<any>(response.text, null);
      });

      if (!aiResponse || !aiResponse.transcript || aiResponse.transcript.trim().length === 0) {
        lesson.analysisStatus = 'failed';
        lesson.analysisError = 'AI không thể nhận diện được nội dung trong file ghi âm.';
        lessonStore.set(targetLessonId, lesson);

        return res.status(500).json({
          success: false,
          errorCode: 'TRANSCRIPTION_FAILED',
          message: 'AI không nhận diện được nội dung trong file ghi âm.',
          warnings: ['Âm thanh quá nhỏ', 'File có nhiều tiếng ồn', 'Định dạng audio không phù hợp'],
          audioUrl,
          storagePath: diskFilePath,
          fileSaved: true,
          lessonId: targetLessonId,
        });
      }

      // Clean AI outputs
      const cleanedTranscript = cleanAiResponse(aiResponse.transcript);
      const cleanedSummary = cleanAiResponse(aiResponse.summary || '');
      const cleanedKeyPoints = Array.isArray(aiResponse.keyPoints)
        ? aiResponse.keyPoints.map((kp: any) => ({
            title: cleanAiResponse(kp.title || 'Ý chính'),
            content: cleanAiResponse(kp.content || ''),
            importance: kp.importance || 'medium',
          }))
        : [];
      const cleanedKeywords = Array.isArray(aiResponse.keywords)
        ? aiResponse.keywords.map((kw: any) => cleanAiResponse(String(kw)))
        : [];
      const cleanedFlashcards = Array.isArray(aiResponse.flashcards)
        ? aiResponse.flashcards.map((fc: any) => ({
            front: cleanAiResponse(fc.front || ''),
            back: cleanAiResponse(fc.back || ''),
            difficulty: fc.difficulty || 'medium',
          }))
        : [];
      const cleanedQuizQuestions = Array.isArray(aiResponse.quizQuestions)
        ? aiResponse.quizQuestions.map((q: any) => ({
            question: cleanAiResponse(q.question || ''),
            options: Array.isArray(q.options) ? q.options.map((opt: any) => cleanAiResponse(String(opt))) : [],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            explanation: cleanAiResponse(q.explanation || ''),
          }))
        : [];
      const cleanedExercises = Array.isArray(aiResponse.exercises)
        ? aiResponse.exercises.map((ex: any) => ({
            question: cleanAiResponse(ex.question || ''),
            answerGuide: cleanAiResponse(ex.answerGuide || ex.solution || ''),
          }))
        : [];
      const cleanedDeadlines = Array.isArray(aiResponse.deadlines)
        ? aiResponse.deadlines.map((dl: any) => ({
            title: cleanAiResponse(dl.title || ''),
            dueDate: dl.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            priority: dl.priority || 'medium',
          }))
        : [];

      // Update in database / store
      lesson.transcript = cleanedTranscript;
      lesson.summary = cleanedSummary;
      lesson.keyPoints = cleanedKeyPoints;
      lesson.keywords = cleanedKeywords;
      lesson.flashcards = cleanedFlashcards;
      lesson.quizQuestions = cleanedQuizQuestions;
      lesson.exercises = cleanedExercises;
      lesson.deadlines = cleanedDeadlines;
      lesson.transcriptionStatus = 'completed';
      lesson.summaryStatus = 'completed';
      lesson.analysisStatus = 'completed';
      lesson.analyzedAt = new Date().toISOString();
      lesson.analysisError = undefined;
      lesson.updatedAt = new Date().toISOString();
      lessonStore.set(targetLessonId, lesson);

      aiSystemStatus.lastQuotaStatus = 'normal';
      aiSystemStatus.lastError = null;

      return res.json({
        success: true,
        lessonId: targetLessonId,
        audioUrl,
        storagePath: diskFilePath,
        fileSaved: true,
        transcript: cleanedTranscript,
        summary: cleanedSummary,
        keyPoints: cleanedKeyPoints,
        keywords: cleanedKeywords,
        flashcards: cleanedFlashcards,
        quizQuestions: cleanedQuizQuestions,
        exercises: cleanedExercises,
        deadlines: cleanedDeadlines,
        warnings: aiResponse.warnings || [],
        isRealAi: true,
      });
    } catch (err: any) {
      const parsed = parseGeminiError(err);
      aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota
        ? 'quota_exceeded'
        : parsed.errorCode === 'AI_RATE_LIMITED'
        ? 'rate_limited'
        : parsed.errorCode === 'AI_AUTH_ERROR'
        ? 'auth_error'
        : 'server_error';
      aiSystemStatus.lastError = parsed.message;
      aiSystemStatus.lastErrorCode = parsed.errorCode;
      aiSystemStatus.retryAfter = parsed.retryAfter || null;

      // Safe logging of quota status or error
      if (parsed.isDailyQuota || parsed.errorCode === 'AI_QUOTA_EXCEEDED') {
        console.warn('[AI AUDIO ANALYSIS QUOTA EXCEEDED]', {
          'audio received': true,
          'file name': targetFileName,
          'file size': fileBuffer ? fileBuffer.length : 0,
          'mime type': cleanMime,
          'storage upload': 'success',
          'ai request': 'sent',
          'ai status': 'quota_exceeded',
          'file preserved': true,
        });
      } else {
        console.error('[AI AUDIO ANALYSIS ERROR]', {
          'audio received': !!fileBuffer,
          'file name': targetFileName,
          'file size': fileBuffer ? fileBuffer.length : 0,
          'mime type': cleanMime,
          'storage upload': diskFilePath ? 'success' : 'failed',
          'ai request': 'sent',
          'error': parsed.message,
        });
      }

      // Update lesson status in database: audio file is PRESERVED, analysis status marked quota_exceeded
      if (targetLessonId && lessonStore.has(targetLessonId)) {
        const l = lessonStore.get(targetLessonId)!;
        l.audioUrl = audioUrl || l.audioUrl;
        l.storagePath = diskFilePath || l.storagePath;
        l.audioFileId = fileId || l.audioFileId;
        l.audioMimeType = cleanMime;
        l.audioSize = fileBuffer ? fileBuffer.length : l.audioSize;
        l.transcriptionStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'failed';
        l.summaryStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'failed';
        l.analysisStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'failed';
        l.analysisError = parsed.message;
        l.updatedAt = new Date().toISOString();
        lessonStore.set(targetLessonId, l);
      }

      return res.status(parsed.httpStatus || 500).json({
        success: false,
        errorCode: parsed.errorCode,
        message: parsed.message,
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
        fileSaved: true, // File audio was preserved on storage
        audioUrl,
        storagePath: diskFilePath,
        fileId,
        lessonId: targetLessonId,
        isDailyQuota: parsed.isDailyQuota,
      });
    }
  }
);

// ====================================================================
// Analyze Stored Audio: POST /api/ai/analyze-stored-audio (Section 8)
// Re-reads audio file directly from server storage disk and sends to Gemini
// ====================================================================
app.post(
  '/api/ai/analyze-stored-audio',
  memoryAudioUploadMiddleware,
  authenticateUser,
  checkAiQuota,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { lessonId, fileId } = req.body || {};

    // Support direct FormData file upload on /api/ai/analyze-stored-audio as well
    let uploadedDiskPath = '';
    let uploadedMimeType = 'audio/webm';
    let uploadedFileId = '';
    if (req.file) {
      if (req.file.size === 0) {
        return res
          .status(400)
          .json(
            buildAiErrorResponse(
              'AUDIO_FILE_MISSING',
              'File ghi âm đang rỗng (0 bytes). Vui lòng kiểm tra lại.',
              { canRetry: false }
            )
          );
      }
      uploadedFileId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ext = path.extname(req.file.originalname || '') || '.webm';
      uploadedDiskPath = path.join(audioUploadDir, `${uploadedFileId}${ext}`);
      fs.writeFileSync(uploadedDiskPath, req.file.buffer);
      uploadedMimeType = (req.file.mimetype || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      audioMetadataStore.set(uploadedFileId, {
        fileId: uploadedFileId,
        originalName: req.file.originalname || 'recording.webm',
        mimeType: uploadedMimeType,
        size: req.file.size,
        duration: Number(req.body?.duration) || 0,
        subjectId: req.body?.subjectId || '',
        lessonId: lessonId || '',
        userId,
        filePath: uploadedDiskPath,
        createdAt: new Date().toISOString(),
      });
    }

    if (!lessonId && !fileId && !uploadedDiskPath) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AUDIO_FILE_MISSING',
            'Thiếu thông tin bài học hoặc mã file ghi âm.',
            { canRetry: false }
          )
        );
    }

    const lesson = lessonId ? lessonStore.get(lessonId) : null;
    if (lesson && !canAccessSharedOrOwned(lesson.ownerId, userId, lesson.id)) {
      return res
        .status(403)
        .json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền truy cập bài học này.'));
    }

    // Locate disk file
    let targetFilePath = uploadedDiskPath || lesson?.storagePath;
    let targetMimeType = uploadedDiskPath ? uploadedMimeType : (lesson?.audioMimeType || 'audio/webm');

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      let targetFId = fileId || lesson?.audioFileId || (lesson?.audioUrl ? lesson.audioUrl.split('/api/audio/')[1]?.split('?')[0] : null);

      if (!targetFId && lessonId) {
        for (const [metaId, meta] of audioMetadataStore.entries()) {
          if (meta.lessonId === lessonId) {
            targetFId = metaId;
            break;
          }
        }
      }

      if (targetFId) {
        const meta = audioMetadataStore.get(targetFId);
        if (meta && fs.existsSync(meta.filePath)) {
          targetFilePath = meta.filePath;
          targetMimeType = meta.mimeType;
        } else {
          const files = fs.readdirSync(audioUploadDir);
          const matched = files.find((f) => f.startsWith(targetFId));
          if (matched) {
            targetFilePath = path.join(audioUploadDir, matched);
            targetMimeType = matched.endsWith('.mp3')
              ? 'audio/mpeg'
              : matched.endsWith('.wav')
              ? 'audio/wav'
              : matched.endsWith('.mp4')
              ? 'audio/mp4'
              : 'audio/webm';
          }
        }
      }
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      return res.status(404).json({
        success: false,
        errorCode: 'AUDIO_NOT_FOUND',
        message: 'Không tìm thấy file ghi âm đã lưu.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        success: false,
        errorCode: 'GEMINI_API_KEY_MISSING',
        message: GEMINI_MISSING_KEY_MESSAGE,
        canRetry: false,
      });
    }

    const audioBuf = fs.readFileSync(targetFilePath);
    const base64Audio = audioBuf.toString('base64');
    const subjectName = lesson?.subjectId ? (subjectStore.get(lesson.subjectId)?.name || 'Môn học') : 'Môn học';
    const lessonTitle = lesson?.title || 'Bài giảng đã lưu';

    if (lesson) {
      lesson.analysisStatus = 'analyzing';
      lessonStore.set(lesson.id, lesson);
    }

    // Safe logging (Section 9 & 11) - strictly no API keys, tokens or secrets
    console.log('[AI ANALYZE STORED AUDIO]', {
      'audio received': true,
      'file name': path.basename(targetFilePath),
      'file size': audioBuf.length,
      'mime type': targetMimeType,
      'storage upload': 'success',
      'ai request': 'sent',
    });

    const analyzePrompt = `Bạn là trợ lý AI học tập cao cấp StudyMind AI cho sinh viên Việt Nam.
Hãy phân tích file âm thanh bài giảng này một cách toàn diện, chi tiết và trung thực với lời giảng.
Môn học: ${subjectName}
Tiêu đề: ${lessonTitle}

Yêu cầu thực hiện:
1. Chuyển giọng nói thành transcript tiếng Việt chi tiết, trung thực. Không tự bịa nội dung. Nếu không nghe rõ, ghi [không nghe rõ]. Giữ nguyên thuật ngữ chuyên ngành.
2. Tạo bản tóm tắt bài giảng (summary) súc tích từ 5-8 câu.
3. Trích xuất các ý chính (keyPoints) gồm "title", "content", "importance" ('high'|'medium'|'low').
4. Trích xuất danh sách từ khóa quan trọng (keywords).
5. Tạo 4-6 thẻ ghi nhớ (flashcards) gồm "front", "back", "difficulty" ('easy'|'medium'|'hard').
6. Tạo 3-4 câu hỏi trắc nghiệm ôn tập (quizQuestions) gồm "question", "options" (mảng 4 lựa chọn), "correctAnswer" (chỉ số 0-3), "explanation" (giải thích).
7. Tạo 2-3 bài tập tự luận hoặc câu hỏi ứng dụng thực tế (exercises) gồm "question" và "answerGuide" (hướng dẫn trả lời).
8. Nhận diện các deadline (deadlines) nếu trong bài giảng có đề cập đến hạn nộp bài tập, thi cử, thuyết trình (gồm "title", "dueDate" YYYY-MM-DD, "priority" 'high'|'medium'|'low'). Nếu không có deadline nào được giảng viên nhắc tới, để mảng rỗng [].
9. Quy định định dạng bắt buộc: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Tuyệt đối KHÔNG sử dụng ký hiệu Markdown như dấu sao (*), dấu đô la ($) làm delimiter công thức hoặc dòng gạch ngang (---, ***).

Yêu cầu định dạng JSON chính xác:
{
  "transcript": "Nội dung lời giảng...",
  "summary": "Tóm tắt bài giảng...",
  "keyPoints": [
    {
      "title": "Tên ý chính",
      "content": "Giải thích chi tiết",
      "importance": "high"
    }
  ],
  "keywords": ["Từ khóa 1", "Từ khóa 2"],
  "flashcards": [
    {
      "front": "Câu hỏi flashcard?",
      "back": "Nội dung trả lời",
      "difficulty": "medium"
    }
  ],
  "quizQuestions": [
    {
      "question": "Câu hỏi trắc nghiệm?",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correctAnswer": 0,
      "explanation": "Giải thích vì sao đúng"
    }
  ],
  "exercises": [
    {
      "question": "Câu hỏi bài tập ứng dụng?",
      "answerGuide": "Hướng dẫn giải chi tiết"
    }
  ],
  "deadlines": [],
  "warnings": []
}`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const aiResponse = await executeGeminiWithRetry('analyze-stored-audio', async (client, modelName) => {
      const response = await client.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: targetMimeType,
                  data: base64Audio,
                },
              },
              { text: analyzePrompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      return safeParseJson<any>(response.text, null);
    });

    if (!aiResponse || !aiResponse.transcript || aiResponse.transcript.trim().length === 0) {
      if (lesson) {
        lesson.analysisStatus = 'failed';
        lesson.analysisError = 'AI không thể nhận diện được nội dung trong file ghi âm.';
        lessonStore.set(lesson.id, lesson);
      }

      return res.status(500).json({
        success: false,
        errorCode: 'TRANSCRIPTION_FAILED',
        message: 'AI không nhận diện được nội dung trong file ghi âm.',
      });
    }

    const cleanedTranscript = cleanAiResponse(aiResponse.transcript);
    const cleanedSummary = cleanAiResponse(aiResponse.summary || '');
    const cleanedKeyPoints = Array.isArray(aiResponse.keyPoints)
      ? aiResponse.keyPoints.map((kp: any) => ({
          title: cleanAiResponse(kp.title || 'Ý chính'),
          content: cleanAiResponse(kp.content || ''),
          importance: kp.importance || 'medium',
        }))
      : [];
    const cleanedKeywords = Array.isArray(aiResponse.keywords)
      ? aiResponse.keywords.map((kw: any) => cleanAiResponse(String(kw)))
      : [];
    const cleanedFlashcards = Array.isArray(aiResponse.flashcards)
      ? aiResponse.flashcards.map((fc: any) => ({
          front: cleanAiResponse(fc.front || ''),
          back: cleanAiResponse(fc.back || ''),
          difficulty: fc.difficulty || 'medium',
        }))
      : [];
    const cleanedQuizQuestions = Array.isArray(aiResponse.quizQuestions)
      ? aiResponse.quizQuestions.map((q: any) => ({
          question: cleanAiResponse(q.question || ''),
          options: Array.isArray(q.options) ? q.options.map((opt: any) => cleanAiResponse(String(opt))) : [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: cleanAiResponse(q.explanation || ''),
        }))
      : [];
    const cleanedExercises = Array.isArray(aiResponse.exercises)
      ? aiResponse.exercises.map((ex: any) => ({
          question: cleanAiResponse(ex.question || ''),
          answerGuide: cleanAiResponse(ex.answerGuide || ex.solution || ''),
        }))
      : [];
    const cleanedDeadlines = Array.isArray(aiResponse.deadlines)
      ? aiResponse.deadlines.map((dl: any) => ({
          title: cleanAiResponse(dl.title || ''),
          dueDate: dl.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          priority: dl.priority || 'medium',
        }))
      : [];

    if (lesson) {
      lesson.transcript = cleanedTranscript;
      lesson.summary = cleanedSummary;
      lesson.keyPoints = cleanedKeyPoints;
      lesson.keywords = cleanedKeywords;
      lesson.flashcards = cleanedFlashcards;
      lesson.quizQuestions = cleanedQuizQuestions;
      lesson.exercises = cleanedExercises;
      lesson.deadlines = cleanedDeadlines;
      lesson.transcriptionStatus = 'completed';
      lesson.summaryStatus = 'completed';
      lesson.analysisStatus = 'completed';
      lesson.analyzedAt = new Date().toISOString();
      lesson.analysisError = undefined;
      lesson.updatedAt = new Date().toISOString();
      lessonStore.set(lesson.id, lesson);
    }

    aiSystemStatus.lastQuotaStatus = 'normal';
    aiSystemStatus.lastError = null;

    return res.json({
      success: true,
      lessonId: lesson?.id,
      transcript: cleanedTranscript,
      summary: cleanedSummary,
      keyPoints: cleanedKeyPoints,
      keywords: cleanedKeywords,
      flashcards: cleanedFlashcards,
      quizQuestions: cleanedQuizQuestions,
      exercises: cleanedExercises,
      deadlines: cleanedDeadlines,
      warnings: aiResponse.warnings || [],
      isRealAi: true,
    });
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota
      ? 'quota_exceeded'
      : parsed.errorCode === 'AI_RATE_LIMITED'
      ? 'rate_limited'
      : parsed.errorCode === 'AI_AUTH_ERROR'
      ? 'auth_error'
      : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    const lessonId = req.body.lessonId;
    if (lessonId && lessonStore.has(lessonId)) {
      const l = lessonStore.get(lessonId)!;
      l.analysisStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'failed';
      l.analysisError = parsed.message;
      l.updatedAt = new Date().toISOString();
      lessonStore.set(lessonId, l);
    }

    return res.status(parsed.httpStatus || 500).json({
      success: false,
      errorCode: parsed.errorCode,
      message: parsed.message,
      retryAfter: parsed.retryAfter,
      canRetry: parsed.canRetry,
      isDailyQuota: parsed.isDailyQuota,
    });
  }
});

// ====================================================================
// Document Upload & Real Text Extraction: POST /api/documents/upload
// ====================================================================
app.post(
  '/api/documents/upload',
  uploadDocumentDisk.single('file'),
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { subjectId, lessonId = '' } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          errorCode: 'NO_FILE',
          message: 'Vui lòng chọn file tài liệu để tải lên.',
        });
      }

      if (req.file.size === 0) {
        return res.status(400).json({
          success: false,
          errorCode: 'EMPTY_FILE',
          message: 'File tài liệu rỗng (0 bytes).',
        });
      }

      if (req.file.size > 25 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          errorCode: 'FILE_TOO_LARGE',
          message: 'Dung lượng file vượt quá giới hạn cho phép (25MB).',
        });
      }

      if (subjectId) {
        const subject = subjectStore.get(subjectId);
        if (subject && subject.ownerId !== userId) {
          return res.status(403).json({
            success: false,
            errorCode: 'FORBIDDEN',
            message: 'Bạn không có quyền truy cập môn học này.',
          });
        }
      }

      const filePath = req.file.path;
      const fileName = req.file.originalname || 'document.pdf';
      const fileType = req.file.mimetype || 'application/octet-stream';
      const fileSize = req.file.size;
      const ext = path.extname(fileName).toLowerCase();
      const documentId = path.parse(path.basename(filePath)).name;

      let rawExtractedText = '';
      let extractionError: string | null = null;

      try {
        if (ext === '.txt' || ext === '.md' || ext === '.csv' || ext === '.json' || fileType.includes('text/')) {
          rawExtractedText = fs.readFileSync(filePath, 'utf-8');
        } else if (ext === '.docx') {
          const result = await mammoth.extractRawText({ path: filePath });
          rawExtractedText = result.value || '';
        } else if (ext === '.pdf' || fileType === 'application/pdf') {
          try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            rawExtractedText = pdfData.text?.trim() || '';
          } catch (pdfErr) {
            console.warn('[pdf-parse warning, attempting Gemini OCR]:', pdfErr);
          }

          if (!rawExtractedText || rawExtractedText.trim().length < 40) {
            const ai = getGeminiClient();
            if (ai) {
              try {
                const pdfBuffer = fs.readFileSync(filePath);
                const base64Pdf = pdfBuffer.toString('base64');
                const ocrResponse = await executeGeminiWithRetry('pdf-ocr', async (client, modelName) => {
                  return await client.models.generateContent({
                    model: modelName,
                    contents: [
                      {
                        parts: [
                          {
                            inlineData: {
                              mimeType: 'application/pdf',
                              data: base64Pdf,
                            },
                          },
                          {
                            text: 'Hãy trích xuất toàn bộ nội dung văn bản trong tài liệu này bằng tiếng Việt. Giữ nguyên thuật ngữ chuyên môn và số liệu. Không dùng ký hiệu Markdown thô như dấu sao hay dấu đô la.',
                          },
                        ],
                      },
                    ],
                  });
                });
                rawExtractedText = ocrResponse.text || '';
              } catch (ocrErr: any) {
                console.warn('[Gemini PDF OCR Error]:', ocrErr?.message);
                extractionError = 'Tài liệu này không có lớp văn bản. Cần bật OCR để nhận diện nội dung.';
              }
            } else {
              extractionError = 'Tài liệu này không có lớp văn bản. Cần bật OCR để nhận diện nội dung.';
            }
          }
        } else if (fileType.startsWith('image/') || ext.match(/\.(png|jpg|jpeg|webp)$/i)) {
          const ai = getGeminiClient();
          if (ai) {
            try {
              const imgBuffer = fs.readFileSync(filePath);
              const base64Img = imgBuffer.toString('base64');
              const imgMime = fileType.startsWith('image/') ? fileType : 'image/jpeg';
              const ocrResponse = await executeGeminiWithRetry('image-ocr', async (client, modelName) => {
                return await client.models.generateContent({
                  model: modelName,
                  contents: [
                    {
                      parts: [
                        {
                          inlineData: {
                            mimeType: imgMime,
                            data: base64Img,
                          },
                        },
                        {
                          text: 'Hãy trích xuất toàn bộ chữ, công thức và ghi chú trong hình ảnh bài giảng/slide này bằng tiếng Việt. Không dùng Markdown thô.',
                        },
                      ],
                    },
                  ],
                });
              });
              rawExtractedText = ocrResponse.text || '';
            } catch (imgOcrErr: any) {
              console.warn('[Gemini Image OCR Error]:', imgOcrErr?.message);
              extractionError = 'Không thể nhận diện văn bản từ hình ảnh: ' + imgOcrErr?.message;
            }
          } else {
            extractionError = 'Cần cấu hình Gemini API để thực hiện OCR nhận diện ảnh.';
          }
        } else {
          extractionError = 'Định dạng file chưa được hỗ trợ trích xuất văn bản tự động.';
        }
      } catch (extErr: any) {
        console.error('Error during file text extraction:', extErr);
        extractionError = extErr?.message || 'Lỗi khi trích xuất nội dung file';
      }

      const cleanedExtractedText = cleanAiResponse(rawExtractedText);
      const isExtracted = cleanedExtractedText.trim().length > 0;

      const storedDoc: StoredDocument = {
        id: documentId,
        ownerId: userId,
        subjectId: subjectId || '',
        lessonId: lessonId || undefined,
        fileName,
        fileType,
        fileSize,
        storagePath: filePath,
        fileUrl: `/api/documents/${documentId}/download`,
        extractedText: cleanedExtractedText,
        summary: '',
        keyTakeaways: [],
        summaryStatus: 'pending',
        processingStatus: isExtracted ? 'completed' : 'failed',
        errorMessage: isExtracted ? undefined : extractionError || 'File đã tải lên nhưng chưa trích xuất được nội dung văn bản.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      documentStore.set(documentId, storedDoc);

      if (!isExtracted) {
        return res.json({
          success: false,
          errorCode: 'EXTRACTION_FAILED',
          message: extractionError || 'File đã tải lên nhưng chưa trích xuất được nội dung văn bản.',
          documentId,
          document: storedDoc,
        });
      }

      return res.json({
        success: true,
        documentId,
        document: storedDoc,
        extractedText: cleanedExtractedText,
        message: 'Tải lên và trích xuất nội dung tài liệu thành công.',
      });
    } catch (err: any) {
      console.error('Lỗi khi tải lên tài liệu:', err);
      return res.status(500).json({
        success: false,
        errorCode: 'UPLOAD_FAILED',
        message: 'Lỗi tải lên tài liệu: ' + (err?.message || 'Lỗi máy chủ'),
      });
    }
  }
);

// Re-extract document text: POST /api/documents/:documentId/extract
app.post('/api/documents/:documentId/extract', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { documentId } = req.params;

    const doc = documentStore.get(documentId);
    if (!doc) {
      return res.status(404).json({
        success: false,
        errorCode: 'DOCUMENT_NOT_FOUND',
        message: 'Không tìm thấy tài liệu.',
      });
    }

    if (doc.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập tài liệu này.',
      });
    }

    if (!doc.storagePath || !fs.existsSync(doc.storagePath)) {
      return res.status(404).json({
        success: false,
        errorCode: 'FILE_NOT_FOUND',
        message: 'File gốc không còn tồn tại trên máy chủ.',
      });
    }

    let text = '';
    const ext = path.extname(doc.fileName).toLowerCase();

    if (ext === '.txt' || ext === '.md' || ext === '.csv' || ext === '.json' || doc.fileType.includes('text/')) {
      text = fs.readFileSync(doc.storagePath, 'utf-8');
    } else if (ext === '.docx') {
      const res = await mammoth.extractRawText({ path: doc.storagePath });
      text = res.value || '';
    } else if (ext === '.pdf') {
      try {
        const dataBuffer = fs.readFileSync(doc.storagePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text || '';
      } catch {}

      if (!text || text.trim().length < 40) {
        const ai = getGeminiClient();
        if (ai) {
          const pdfBuffer = fs.readFileSync(doc.storagePath);
          const base64Pdf = pdfBuffer.toString('base64');
          const ocrRes = await executeGeminiWithRetry('pdf-re-extract', async (client, modelName) => {
            return await client.models.generateContent({
              model: modelName,
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
                    { text: 'Hãy trích xuất toàn bộ văn bản trong tài liệu PDF này bằng tiếng Việt. Không dùng Markdown.' },
                  ],
                },
              ],
            });
          });
          text = ocrRes.text || '';
        }
      }
    }

    const cleaned = cleanAiResponse(text);
    if (cleaned.trim().length > 0) {
      doc.extractedText = cleaned;
      doc.processingStatus = 'completed';
      doc.updatedAt = new Date().toISOString();
      documentStore.set(documentId, doc);

      return res.json({
        success: true,
        extractedText: cleaned,
        processingStatus: 'completed',
        message: 'Trích xuất văn bản thành công.',
      });
    }

    doc.processingStatus = 'failed';
    doc.errorMessage = 'Tài liệu này không có lớp văn bản. Cần bật OCR để nhận diện nội dung.';
    documentStore.set(documentId, doc);

    return res.json({
      success: false,
      errorCode: 'EXTRACTION_EMPTY',
      message: 'Tài liệu này không có lớp văn bản. Cần bật OCR để nhận diện nội dung.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: 'EXTRACTION_ERROR',
      message: 'Lỗi khi trích xuất tài liệu: ' + err?.message,
    });
  }
});

// List documents: GET /api/documents
app.get('/api/documents', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const subjectId = req.query.subjectId as string;

  const docs = Array.from(documentStore.values()).filter((d) => {
    if (d.ownerId !== userId) return false;
    if (subjectId && d.subjectId !== subjectId) return false;
    return true;
  });

  res.json({ success: true, documents: docs });
});

// Get single document: GET /api/documents/:documentId
app.get('/api/documents/:documentId', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { documentId } = req.params;

  const doc = documentStore.get(documentId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu.' });
  }

  if (doc.ownerId !== userId) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tài liệu này.' });
  }

  res.json({ success: true, document: doc });
});

// Download/view document file: GET /api/documents/:documentId/download
app.get('/api/documents/:documentId/download', (req: Request, res: Response) => {
  const { documentId } = req.params;
  const doc = documentStore.get(documentId);

  if (!doc || !doc.storagePath || !fs.existsSync(doc.storagePath)) {
    return res.status(404).json({ success: false, message: 'File không tồn tại trên hệ thống.' });
  }

  res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
  const stream = fs.createReadStream(doc.storagePath);
  stream.pipe(res);
});

// Delete document: DELETE /api/documents/:documentId
app.delete('/api/documents/:documentId', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { documentId } = req.params;

  const doc = documentStore.get(documentId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu cần xóa.' });
  }

  if (doc.ownerId !== userId) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa tài liệu này.' });
  }

  if (doc.storagePath && fs.existsSync(doc.storagePath)) {
    try {
      fs.unlinkSync(doc.storagePath);
    } catch {}
  }

  documentStore.delete(documentId);
  res.json({ success: true, message: 'Đã xóa tài liệu thành công.' });
});

// ====================================================================
// AI Chatbot: POST /api/ai/chat (and alias POST /api/chat)
// ====================================================================
app.post(['/api/ai/chat', '/api/chat'], authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limitCheck = checkUserActionLimit(userId, 'chat');
    if (!limitCheck.allowed) {
      return res
        .status(429)
        .json(
          buildAiErrorResponse('AI_QUOTA_EXCEEDED', limitCheck.message, {
            canRetry: false,
          })
        );
    }

    const {
      conversationId,
      subjectId,
      lessonId,
      documentId,
      question: rawQuestion,
      message: rawMessage,
      prompt: rawPrompt,
      mode: rawMode,
      scope: rawScope,
      language: rawLanguage,
    } = req.body;

    const question = String(rawQuestion ?? rawMessage ?? rawPrompt ?? '').trim();
    const mode = (rawMode || rawScope || 'general') as 'lesson' | 'subject' | 'document' | 'general';
    const lang: 'vi' | 'en' = rawLanguage === 'en' ? 'en' : 'vi';
    const activeConvId = conversationId || `conv_${Date.now()}`;

    console.log('[AI_CHAT_REQUEST]', {
      requestId: req.requestId,
      userId,
      mode,
      language: lang,
      hasLessonId: Boolean(lessonId),
      hasDocumentId: Boolean(documentId),
      hasSubjectId: Boolean(subjectId),
      questionLength: question.length,
    });

    if (!question) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            lang === 'en'
              ? 'Please enter a question before sending.'
              : 'Vui lòng nhập nội dung hoặc câu hỏi trước khi gửi.'
          )
        );
    }

    if (question.length > 2500) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            lang === 'en'
              ? 'Your question is too long (over 2500 characters). Please shorten it.'
              : 'Câu hỏi quá dài (vượt quá 2500 ký tự). Vui lòng rút gọn câu hỏi.'
          )
        );
    }

    const sources: Array<{ type: string; id: string; title: string }> = [];
    let relevantContext = '';

    // 1. Validate & load document context if provided
    if (documentId) {
      const doc = documentStore.get(documentId);
      if (!doc) {
        if (mode === 'document') {
          return res
            .status(404)
            .json(
              buildAiErrorResponse(
                'DOCUMENT_TEXT_EMPTY',
                'Không tìm thấy tài liệu đã chọn.'
              )
            );
        }
      } else {
        if (!canAccessSharedOrOwned(doc.ownerId, userId, doc.id)) {
          return res
            .status(403)
            .json(
              buildAiErrorResponse(
                'FORBIDDEN',
                'Bạn không có quyền truy cập vào tài liệu này.'
              )
            );
        }

        if (!doc.extractedText || doc.extractedText.trim().length === 0) {
          return res
            .status(400)
            .json(
              buildAiErrorResponse(
                'DOCUMENT_TEXT_EMPTY',
                'Tài liệu không có nội dung văn bản để phân tích.'
              )
            );
        }

        sources.push({
          type: 'document',
          id: doc.id,
          title: doc.fileName,
        });

        const docText = truncateAiInputText(doc.extractedText, 15000);
        relevantContext += `TÊN TÀI LIỆU: ${doc.fileName}\nNỘI DUNG TÀI LIỆU:\n${docText}\n\n`;
      }
    }

    // 2. Validate & load lesson context if provided
    if (lessonId) {
      const lesson = lessonStore.get(lessonId);
      if (lesson) {
        if (!canAccessSharedOrOwned(lesson.ownerId, userId, lesson.id)) {
          return res
            .status(403)
            .json(
              buildAiErrorResponse(
                'FORBIDDEN',
                'Bạn không có quyền truy cập vào bài học này.'
              )
            );
        }
        sources.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
        });
        relevantContext += `BÀI HỌC: ${lesson.title}\n`;
        if (lesson.summary) relevantContext += `TÓM TẮT:\n${lesson.summary}\n`;
        if (lesson.transcript) relevantContext += `TRANSCRIPT NỘI DUNG:\n${truncateAiInputText(lesson.transcript, 10000)}\n`;
        if (lesson.keyPoints && lesson.keyPoints.length > 0) {
          relevantContext += `Ý CHÍNH:\n${lesson.keyPoints.map((kp: any) => `- ${kp.title}: ${kp.content}`).join('\n')}\n`;
        }
        if (lesson.concepts && lesson.concepts.length > 0) {
          relevantContext += `KHÁI NIỆM:\n${lesson.concepts.map((cp: any) => `- ${cp.term}: ${cp.definition}`).join('\n')}\n`;
        }
      }
    }

    // 3. Validate & load subject context if provided
    if (subjectId && !relevantContext) {
      const subject = subjectStore.get(subjectId);
      if (subject) {
        if (!canAccessSharedOrOwned(subject.ownerId, userId, subject.id)) {
          return res
            .status(403)
            .json(
              buildAiErrorResponse(
                'FORBIDDEN',
                'Bạn không có quyền truy cập vào môn học này.'
              )
            );
        }
        sources.push({
          type: 'subject',
          id: subject.id,
          title: subject.name,
        });
        relevantContext += `MÔN HỌC: ${subject.name} (${subject.code})\nMÔ TẢ: ${subject.description || ''}\n`;
        const matchingLessons = Array.from(lessonStore.values()).filter(
          (l) => l.subjectId === subjectId && canAccessSharedOrOwned(l.ownerId, userId, l.id)
        );
        for (const ml of matchingLessons) {
          relevantContext += `\nBài: ${ml.title}\n${ml.summary || ml.transcript?.slice(0, 1000) || ''}\n`;
        }
      }
    }

    // Fallback to client-provided contextText if lesson/document was created locally
    if (!relevantContext && req.body.contextText && String(req.body.contextText).trim()) {
      const ctxTitle = String(req.body.contextTitle || 'Tài liệu học tập').trim();
      const ctxBody = truncateAiInputText(String(req.body.contextText).trim(), 12000);
      relevantContext += `TÀI LIỆU / BÀI HỌC: ${ctxTitle}\nNỘI DUNG:\n${ctxBody}\n`;
      if (sources.length === 0) {
        sources.push({
          type: mode === 'document' ? 'document' : 'lesson',
          id: String(documentId || lessonId || subjectId || 'ctx_client'),
          title: ctxTitle,
        });
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
            canRetry: false,
          })
        );
    }

    const systemInstruction =
      lang === 'en'
        ? `You are the StudySync AI academic teaching assistant.
Please answer clearly, accurately, concisely, and in English (unless the user explicitly asks for another language).
When lesson or document context is provided, prioritize using that context to answer accurately without fabricating facts.
If the question is a general academic question, explain clearly based on sound knowledge.
Format cleanly with paragraphs and numbered lists. Do not use raw markdown symbols like ***, ---, ___.`
        : `Bạn là trợ giảng AI bằng tiếng Việt của StudySync AI.
Hãy trả lời rõ ràng, chính xác, súc tích và dễ hiểu cho sinh viên bằng tiếng Việt.
Khi có dữ liệu bài học hoặc tài liệu tham chiếu được cung cấp, hãy ưu tiên sử dụng nội dung đó để trả lời chính xác và không bịa đặt.
Nếu câu hỏi nằm ngoài phạm vi tài liệu hoặc là câu hỏi kiến thức học thuật chung, hãy giải thích rõ ràng dựa trên kiến thức chuẩn xác.
Trình bày câu trả lời mạch lạc, dùng đoạn văn rõ ràng và danh sách đánh số. Không dùng các ký hiệu Markdown thô gây rối mắt như ***, ---, ___.`;

    const userPrompt = relevantContext.trim()
      ? `${systemInstruction}\n\nNGỮ CẢNH BÀI HỌC / TÀI LIỆU CỦA SINH VIÊN:\n${relevantContext.trim()}\n\nCÂU HỎI CỦA SINH VIÊN:\n${question}`
      : `${systemInstruction}\n\nCÂU HỎI CỦA SINH VIÊN:\n${question}`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const rawAnswer = await executeGeminiWithRetry(
      'ai-chat',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
        });
        return response.text || '';
      }
    );

    aiSystemStatus.lastQuotaStatus = 'normal';
    aiSystemStatus.lastError = null;

    const cleanedAnswer = cleanAiResponse(rawAnswer);

    if (!cleanedAnswer) {
      return res
        .status(502)
        .json(
          buildAiErrorResponse(
            'AI_EMPTY_RESPONSE',
            'AI không tạo được câu trả lời cho nội dung này. Vui lòng thử lại.',
            { canRetry: true }
          )
        );
    }

    console.log('[AI_CHAT_SUCCESS]', {
      requestId: req.requestId,
      userId,
      conversationId: activeConvId,
      answerLength: cleanedAnswer.length,
    });

    return res.json(
      buildAiSuccessResponse(
        {
          answer: cleanedAnswer,
          sources,
          conversationId: activeConvId,
        },
        {
          reply: cleanedAnswer,
        }
      )
    );
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota
      ? 'quota_exceeded'
      : parsed.errorCode === 'AI_RATE_LIMITED'
      ? 'rate_limited'
      : parsed.errorCode === 'AI_INVALID_API_KEY'
      ? 'auth_error'
      : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// Helper function to resolve document or text context with strict userId ownership verification
function resolveTextContext(req: AuthenticatedRequest): {
  text: string;
  title: string;
  subjectName: string;
  subjectId?: string;
  lessonId?: string;
  targetDoc?: StoredDocument;
  targetLesson?: StoredLesson;
  errorStatus?: number;
  errorCode?: string;
  errorMessage?: string;
} {
  const userId = req.userId!;
  const { documentId, lessonId, subjectId, text, title = 'Tài liệu', subjectName = '' } = req.body;

  if (documentId) {
    const doc = documentStore.get(documentId);
    if (!doc) {
      if (text && String(text).trim()) {
        return {
          text: String(text).trim(),
          title,
          subjectName,
          subjectId,
          lessonId,
        };
      }
      return {
        text: '',
        title,
        subjectName,
        errorStatus: 404,
        errorCode: 'DOCUMENT_TEXT_EMPTY',
        errorMessage: 'Không tìm thấy tài liệu yêu cầu.',
      };
    }
    if (!canAccessSharedOrOwned(doc.ownerId, userId, doc.id)) {
      return {
        text: '',
        title,
        subjectName,
        errorStatus: 403,
        errorCode: 'FORBIDDEN',
        errorMessage: 'Bạn không có quyền truy cập vào tài liệu này.',
      };
    }
    const resolvedDocText = (doc.extractedText || text || '').trim();
    if (!resolvedDocText) {
      return {
        text: '',
        title: doc.fileName,
        subjectName,
        targetDoc: doc,
        errorStatus: 400,
        errorCode: 'DOCUMENT_TEXT_EMPTY',
        errorMessage: 'Tài liệu không có nội dung văn bản để phân tích.',
      };
    }
    return {
      text: resolvedDocText,
      title: doc.fileName,
      subjectName: subjectName || (subjectStore.get(doc.subjectId)?.name || 'Môn học'),
      subjectId: doc.subjectId || subjectId,
      lessonId: doc.lessonId || lessonId,
      targetDoc: doc,
    };
  }

  if (lessonId) {
    const lesson = lessonStore.get(lessonId);
    if (!lesson) {
      if (!text || !String(text).trim()) {
        return {
          text: '',
          title,
          subjectName,
          errorStatus: 404,
          errorCode: 'AI_INPUT_EMPTY',
          errorMessage: 'Không tìm thấy bài học yêu cầu.',
        };
      }
    } else {
      if (!canAccessSharedOrOwned(lesson.ownerId, userId, lesson.id)) {
        return {
          text: '',
          title,
          subjectName,
          errorStatus: 403,
          errorCode: 'FORBIDDEN',
          errorMessage: 'Bạn không có quyền truy cập vào bài học này.',
        };
      }
      const resolvedLessonText = (text || lesson.transcript || lesson.summary || '').trim();
      return {
        text: resolvedLessonText,
        title: lesson.title || title,
        subjectName: subjectName || (subjectStore.get(lesson.subjectId)?.name || 'Môn học'),
        subjectId: lesson.subjectId || subjectId,
        lessonId: lesson.id,
        targetLesson: lesson,
      };
    }
  }

  return {
    text: String(text || '').trim(),
    title,
    subjectName,
    subjectId,
    lessonId,
  };
}

// ====================================================================
// Document Summary: POST /api/ai/document-summary
// ====================================================================
app.post('/api/ai/document-summary', authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { forceRegenerate = false } = req.body;
    const ctx = resolveTextContext(req);

    if (ctx.errorCode) {
      return res
        .status(ctx.errorStatus || 400)
        .json(
          buildAiErrorResponse(ctx.errorCode, ctx.errorMessage, {
            canRetry: false,
          })
        );
    }

    const { text, title, subjectName, targetDoc } = ctx;

    const limitCheck = checkUserActionLimit(userId, 'summary');
    if (!limitCheck.allowed) {
      return res
        .status(429)
        .json(
          buildAiErrorResponse('AI_QUOTA_EXCEEDED', limitCheck.message, {
            canRetry: false,
          })
        );
    }

    if (!text || text.trim().length === 0) {
      const emptyCode = req.body.documentId ? 'DOCUMENT_TEXT_EMPTY' : 'AI_INPUT_EMPTY';
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            emptyCode,
            emptyCode === 'DOCUMENT_TEXT_EMPTY'
              ? 'Tài liệu không có nội dung văn bản để phân tích.'
              : 'Vui lòng nhập nội dung văn bản cần tóm tắt.',
            { canRetry: false }
          )
        );
    }

    if (targetDoc && targetDoc.summaryStatus === 'processing') {
      return res
        .status(429)
        .json(
          buildAiErrorResponse(
            'AI_RATE_LIMITED',
            'Tài liệu đang được phân tích tóm tắt bởi một yêu cầu trước đó. Vui lòng đợi trong giây lát.',
            { canRetry: true, retryAfter: 5 }
          )
        );
    }

    if (targetDoc && !forceRegenerate && targetDoc.summary && targetDoc.summary.trim().length > 0) {
      return res.json(
        buildAiSuccessResponse(
          {
            summary: targetDoc.summary,
            keyTakeaways: targetDoc.keyTakeaways || [],
            cached: true,
            summaryCreatedAt: targetDoc.summaryCreatedAt,
            summaryModel: targetDoc.summaryModel || GEMINI_CHAT_MODEL,
            summaryVersion: targetDoc.summaryVersion || 1,
          },
          {
            message: 'Đã tải bản tóm tắt từ bộ nhớ lưu trữ.',
            isRealAi: true,
          }
        )
      );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
            canRetry: false,
          })
        );
    }

    if (targetDoc) {
      targetDoc.summaryStatus = 'processing';
      targetDoc.lastRequestAt = new Date().toISOString();
      documentStore.set(targetDoc.id, targetDoc);
    }

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const safeInput = truncateAiInputText(text, 16000);
    const prompt = `Bạn là trợ lý AI học tập tiếng Việt.
Hãy tóm tắt nội dung tài liệu sau đây một cách trung thực, súc tích và dễ hiểu.
Quy định định dạng: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Không sử dụng ký hiệu Markdown như dấu sao, dấu đô la làm delimiter công thức hoặc dòng gạch ngang. Không dùng ---, ***, ** hoặc bullet bắt đầu bằng dấu *. Sử dụng danh sách đánh số.
MÔN HỌC: ${subjectName}
TÀI LIỆU: ${title}

NỘI DUNG:
${safeInput}

Yêu cầu định dạng JSON:
{
  "summary": "Đoạn văn tóm tắt toàn diện 5-8 câu...",
  "keyTakeaways": ["Ý chính 1", "Ý chính 2", "Ý chính 3", "Ý chính 4"]
}`;

    const parsed = await executeGeminiWithRetry(
      'document-summary',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return cleanAndParseGeminiJson<any>(response.text, 'document-summary');
      }
    );

    if (parsed && typeof parsed.summary === 'string' && parsed.summary.trim()) {
      const cleanedSummary = cleanAiResponse(parsed.summary);
      const cleanedTakeaways = Array.isArray(parsed.keyTakeaways)
        ? parsed.keyTakeaways.map((k: string) => cleanAiResponse(k)).filter(Boolean)
        : [];

      aiSystemStatus.lastQuotaStatus = 'normal';
      aiSystemStatus.lastError = null;

      if (targetDoc) {
        targetDoc.summary = cleanedSummary;
        targetDoc.keyTakeaways = cleanedTakeaways;
        targetDoc.summaryStatus = 'completed';
        targetDoc.summaryCreatedAt = new Date().toISOString();
        targetDoc.summaryModel = GEMINI_CHAT_MODEL;
        targetDoc.summaryError = undefined;
        targetDoc.summaryVersion = (targetDoc.summaryVersion || 0) + 1;
        targetDoc.updatedAt = new Date().toISOString();
        documentStore.set(targetDoc.id, targetDoc);
      }

      return res.json(
        buildAiSuccessResponse(
          {
            summary: cleanedSummary,
            keyTakeaways: cleanedTakeaways,
            cached: false,
            summaryCreatedAt: new Date().toISOString(),
            summaryModel: GEMINI_CHAT_MODEL,
          },
          { isRealAi: true }
        )
      );
    }

    if (targetDoc) {
      targetDoc.summaryStatus = 'failed';
      targetDoc.summaryError = 'Không thể tạo tóm tắt từ tài liệu.';
      documentStore.set(targetDoc.id, targetDoc);
    }

    return res
      .status(502)
      .json(
        buildAiErrorResponse(
          'AI_INVALID_RESPONSE',
          'Dữ liệu tóm tắt trả về từ AI không đúng định dạng. Vui lòng thử lại.',
          { canRetry: true }
        )
      );
  } catch (err: any) {
    const parsedErr = parseGeminiError(err);
    aiSystemStatus.lastQuotaStatus = parsedErr.isDailyQuota
      ? 'quota_exceeded'
      : parsedErr.errorCode === 'AI_RATE_LIMITED'
      ? 'rate_limited'
      : parsedErr.errorCode === 'AI_INVALID_API_KEY'
      ? 'auth_error'
      : 'server_error';
    aiSystemStatus.lastError = parsedErr.message;
    aiSystemStatus.lastErrorCode = parsedErr.errorCode;
    aiSystemStatus.retryAfter = parsedErr.retryAfter || null;

    const { targetDoc } = resolveTextContext(req);
    if (targetDoc) {
      targetDoc.summaryStatus = parsedErr.isDailyQuota ? 'quota_exceeded' : 'failed';
      targetDoc.summaryError = parsedErr.message;
      documentStore.set(targetDoc.id, targetDoc);
    }

    return res.status(parsedErr.httpStatus || 500).json(
      buildAiErrorResponse(parsedErr.errorCode, parsedErr.message, {
        retryAfter: parsedErr.retryAfter,
        canRetry: parsedErr.canRetry,
        hasExistingSummary: !!targetDoc?.summary,
        existingSummary: targetDoc?.summary || undefined,
      })
    );
  }
});

// Alias: POST /api/ai/summarize & POST /api/ai/summary
app.post(['/api/ai/summarize', '/api/ai/summary'], authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ctx = resolveTextContext(req);
    if (ctx.errorCode) {
      return res
        .status(ctx.errorStatus || 400)
        .json(buildAiErrorResponse(ctx.errorCode, ctx.errorMessage));
    }

    const { text, title, subjectName, targetLesson } = ctx;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Vui lòng nhập nội dung văn bản cần tóm tắt.'
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE));
    }

    const safeInput = truncateAiInputText(text, 16000);
    const prompt = `Bạn là trợ lý học tập StudyMind AI.
Hãy tóm tắt văn bản học tập sau thành 5-7 câu súc tích bằng tiếng Việt tự nhiên.
Quy định định dạng: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Không sử dụng ký hiệu Markdown như dấu sao, dấu đô la làm delimiter công thức hoặc dòng gạch ngang. Không dùng ---, ***, ** hoặc bullet bắt đầu bằng dấu *. Sử dụng danh sách đánh số.
Môn học: ${subjectName}
Chủ đề: ${title}
Nội dung:
${safeInput}

Trả về JSON: { "summary": "Nội dung tóm tắt...", "keyTakeaways": ["Ý 1", "Ý 2", "Ý 3"] }`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsed = await executeGeminiWithRetry(
      'summarize',
      async (client, modelName) => {
        const genRes = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return cleanAndParseGeminiJson<any>(genRes.text, 'summarize');
      }
    );

    if (parsed && typeof parsed.summary === 'string' && parsed.summary.trim()) {
      aiSystemStatus.lastQuotaStatus = 'normal';
      aiSystemStatus.lastError = null;
      const cleanedSummary = cleanAiResponse(parsed.summary);
      const cleanedTakeaways = Array.isArray(parsed.keyTakeaways)
        ? parsed.keyTakeaways.map((k: string) => cleanAiResponse(k)).filter(Boolean)
        : [];

      if (targetLesson) {
        targetLesson.summary = cleanedSummary;
        targetLesson.summaryStatus = 'completed';
        targetLesson.updatedAt = new Date().toISOString();
        lessonStore.set(targetLesson.id, targetLesson);
      }

      return res.json(
        buildAiSuccessResponse(
          {
            summary: cleanedSummary,
            keyTakeaways: cleanedTakeaways,
          },
          { isRealAi: true }
        )
      );
    }

    return res
      .status(502)
      .json(
        buildAiErrorResponse(
          'AI_INVALID_RESPONSE',
          'Không thể tạo tóm tắt hợp lệ từ AI.'
        )
      );
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// ====================================================================
// Generate Flashcards: POST /api/ai/generate-flashcards & POST /api/ai/flashcards
// ====================================================================
app.post(['/api/ai/generate-flashcards', '/api/ai/flashcards'], authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.body?.requirePremium === true && !isUserPremium(userId)) {
      return res
        .status(403)
        .json(
          buildAiErrorResponse(
            'PREMIUM_REQUIRED',
            'Tính năng này chỉ dành cho tài khoản Premium.',
            { canRetry: false }
          )
        );
    }

    const limitCheck = checkUserActionLimit(userId, 'flashcard');
    if (!limitCheck.allowed) {
      return res
        .status(429)
        .json(
          buildAiErrorResponse('AI_QUOTA_EXCEEDED', limitCheck.message, {
            canRetry: false,
          })
        );
    }

    const ctx = resolveTextContext(req);
    if (ctx.errorCode) {
      return res
        .status(ctx.errorStatus || 400)
        .json(buildAiErrorResponse(ctx.errorCode, ctx.errorMessage));
    }

    const { text, subjectName, title, subjectId, lessonId, targetLesson } = ctx;
    const count = Math.min(Math.max(Number(req.body.count) || 5, 1), 20);

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Vui lòng nhập nội dung hoặc chọn tài liệu/bài học trước khi tạo flashcard.',
            { canRetry: false }
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
            canRetry: false,
          })
        );
    }

    const safeInput = truncateAiInputText(text, 16000);
    const prompt = `Từ nội dung học tập sau, hãy tạo ${count} thẻ ghi nhớ (Flashcards) câu hỏi và đáp án chi tiết bằng tiếng Việt.
Quy định định dạng: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Không sử dụng ký hiệu Markdown như dấu sao, dấu đô la làm delimiter công thức hoặc dòng gạch ngang. Không dùng ---, ***, ** hoặc bullet bắt đầu bằng dấu *. Nếu có công thức, viết công thức trực tiếp mà không bao quanh bằng dấu $.
Môn học: ${subjectName}
Tài liệu: ${title}

VĂN BẢN:
${safeInput}

Yêu cầu trả về JSON:
{
  "flashcards": [
    {
      "front": "Câu hỏi ngắn hoặc thuật ngữ trọng tâm?",
      "back": "Câu trả lời hoặc định nghĩa chính xác.",
      "example": "Ví dụ minh họa thực tế",
      "difficulty": "easy",
      "topic": "${subjectName || 'Chung'}"
    }
  ]
}`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsed = await executeGeminiWithRetry(
      'generate-flashcards',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return cleanAndParseGeminiJson<any>(response.text, 'generate-flashcards');
      }
    );

    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.flashcards)
      ? parsed.flashcards
      : null;

    if (rawList && rawList.length > 0) {
      aiSystemStatus.lastQuotaStatus = 'normal';
      aiSystemStatus.lastError = null;
      const nowIso = new Date().toISOString();
      const cleanedCards = rawList
        .map((c: any, idx: number) => ({
          id: c.id || `fc_${Date.now()}_${idx}`,
          ownerId: userId,
          subjectId: subjectId || '',
          lessonId: lessonId || undefined,
          front: cleanAiResponse(c.front || c.question || ''),
          back: cleanAiResponse(c.back || c.answer || ''),
          example: c.example ? cleanAiResponse(c.example) : undefined,
          difficulty: (['easy', 'medium', 'hard'].includes(c.difficulty) ? c.difficulty : 'medium') as
            | 'easy'
            | 'medium'
            | 'hard',
          topic: cleanAiResponse(c.topic || subjectName || 'Chung'),
          reviewStatus: 'new' as const,
          correctCount: 0,
          incorrectCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        }))
        .filter((c: any) => c.front && c.back);

      if (cleanedCards.length === 0) {
        return res
          .status(502)
          .json(
            buildAiErrorResponse(
              'AI_INVALID_RESPONSE',
              'Dữ liệu flashcard trả về từ AI bị thiếu trường câu hỏi hoặc đáp án.'
            )
          );
      }

      for (const card of cleanedCards) {
        flashcardsMap.set(card.id, card);
      }

      if (targetLesson) {
        targetLesson.flashcards = cleanedCards;
        targetLesson.updatedAt = nowIso;
        lessonStore.set(targetLesson.id, targetLesson);
      }

      return res.json(
        buildAiSuccessResponse(
          { flashcards: cleanedCards },
          { isRealAi: true }
        )
      );
    }

    return res
      .status(502)
      .json(
        buildAiErrorResponse(
          'AI_INVALID_RESPONSE',
          'Không thể tạo flashcard hợp lệ từ tài liệu.',
          { canRetry: true }
        )
      );
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// ====================================================================
// Generate Quiz: POST /api/ai/generate-quiz & POST /api/ai/quiz
// ====================================================================
app.post(['/api/ai/generate-quiz', '/api/ai/quiz'], authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.body?.requirePremium === true && !isUserPremium(userId)) {
      return res
        .status(403)
        .json(
          buildAiErrorResponse(
            'PREMIUM_REQUIRED',
            'Tính năng này chỉ dành cho tài khoản Premium.',
            { canRetry: false }
          )
        );
    }

    const limitCheck = checkUserActionLimit(userId, 'quiz');
    if (!limitCheck.allowed) {
      return res
        .status(429)
        .json(
          buildAiErrorResponse('AI_QUOTA_EXCEEDED', limitCheck.message, {
            canRetry: false,
          })
        );
    }

    const ctx = resolveTextContext(req);
    if (ctx.errorCode) {
      return res
        .status(ctx.errorStatus || 400)
        .json(buildAiErrorResponse(ctx.errorCode, ctx.errorMessage));
    }

    const { text, subjectName, title, subjectId, lessonId, targetLesson } = ctx;
    const numQuestions = Math.min(Math.max(Number(req.body.numQuestions || req.body.questionCount) || 4, 1), 15);

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Vui lòng nhập nội dung hoặc chọn tài liệu/bài học trước khi tạo câu hỏi trắc nghiệm.',
            { canRetry: false }
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
            canRetry: false,
          })
        );
    }

    const safeInput = truncateAiInputText(text, 16000);
    const prompt = `Hãy tạo ${numQuestions} câu hỏi trắc nghiệm kiểm tra kiến thức sinh viên từ tài liệu sau bằng tiếng Việt.
Quy định định dạng: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Không sử dụng ký hiệu Markdown như dấu sao, dấu đô la làm delimiter công thức hoặc dòng gạch ngang. Không dùng ---, ***, ** hoặc bullet bắt đầu bằng dấu *. Nếu có công thức, viết công thức trực tiếp mà không bao quanh bằng dấu $.
Môn học: ${subjectName}
Tài liệu: ${title}

NỘI DUNG:
${safeInput}

Yêu cầu định dạng JSON:
{
  "title": "Trắc nghiệm ôn tập ${title}",
  "questions": [
    {
      "question": "Nội dung câu hỏi rõ ràng?",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correctAnswer": 0,
      "explanation": "Giải thích chi tiết vì sao đáp án này đúng.",
      "difficulty": "medium"
    }
  ]
}`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsed = await executeGeminiWithRetry(
      'generate-quiz',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return cleanAndParseGeminiJson<any>(response.text, 'generate-quiz');
      }
    );

    const rawQuestions = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
      ? parsed.questions
      : null;

    if (rawQuestions && rawQuestions.length > 0) {
      aiSystemStatus.lastQuotaStatus = 'normal';
      aiSystemStatus.lastError = null;
      const cleanedQuestions = rawQuestions
        .map((q: any, idx: number) => ({
          id: q.id || `q_${Date.now()}_${idx}`,
          question: cleanAiResponse(q.question || ''),
          options: Array.isArray(q.options)
            ? q.options.map((opt: string) => cleanAiResponse(opt)).filter(Boolean)
            : [],
          correctAnswer:
            typeof q.correctAnswer === 'number'
              ? q.correctAnswer
              : typeof q.correctAnswerIndex === 'number'
              ? q.correctAnswerIndex
              : 0,
          explanation: cleanAiResponse(q.explanation || ''),
          difficulty: q.difficulty || 'medium',
        }))
        .filter((q: any) => q.question && q.options.length >= 2);

      if (cleanedQuestions.length === 0) {
        return res
          .status(502)
          .json(
            buildAiErrorResponse(
              'AI_INVALID_RESPONSE',
              'Dữ liệu câu hỏi trắc nghiệm trả về từ AI không hợp lệ.'
            )
          );
      }

      const quizObj = {
        id: `quiz_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        ownerId: userId,
        subjectId: subjectId || '',
        lessonId: lessonId || undefined,
        title: cleanAiResponse(parsed?.title || `Trắc nghiệm ôn tập ${title}`),
        questions: cleanedQuestions,
        difficulty: 'medium' as const,
        createdAt: new Date().toISOString(),
      };

      quizzesMap.set(quizObj.id, quizObj);

      if (targetLesson) {
        targetLesson.quizQuestions = cleanedQuestions;
        targetLesson.updatedAt = new Date().toISOString();
        lessonStore.set(targetLesson.id, targetLesson);
      }

      return res.json(
        buildAiSuccessResponse(
          { quiz: quizObj, questions: cleanedQuestions },
          { isRealAi: true }
        )
      );
    }

    return res
      .status(502)
      .json(
        buildAiErrorResponse(
          'AI_INVALID_RESPONSE',
          'Không thể tạo trắc nghiệm từ tài liệu.',
          { canRetry: true }
        )
      );
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// ====================================================================
// Generate Practice Exercises: POST /api/ai/generate-exercises
// ====================================================================
app.post('/api/ai/generate-exercises', authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ctx = resolveTextContext(req);
    if (ctx.errorCode) {
      return res
        .status(ctx.errorStatus || 400)
        .json(buildAiErrorResponse(ctx.errorCode, ctx.errorMessage));
    }

    const { text, subjectName, title, targetLesson } = ctx;
    const count = Math.min(Math.max(Number(req.body.count) || 3, 1), 10);

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Vui lòng nhập nội dung văn bản hoặc chọn tài liệu/bài học để tạo bài tập.',
            { canRetry: false }
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
            canRetry: false,
          })
        );
    }

    const safeInput = truncateAiInputText(text, 16000);
    const prompt = `Từ nội dung học tập sau, hãy tạo ${count} bài tập tự luận và ứng dụng thực hành cho sinh viên.
Môn học: ${subjectName}
Tài liệu: ${title}

NỘI DUNG:
${safeInput}

Quy định định dạng: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Không sử dụng ký hiệu Markdown như dấu sao, dấu đô la làm delimiter công thức hoặc dòng gạch ngang. Không dùng ---, ***, ** hoặc bullet bắt đầu bằng dấu *. Nếu có công thức, viết trực tiếp mà không bao quanh bằng $.
Yêu cầu JSON:
{
  "exercises": [
    {
      "title": "Tên bài tập",
      "question": "Đề bài chi tiết và yêu cầu cần thực hiện",
      "hint": "Gợi ý tiếp cận bài toán",
      "solution": "Lời giải và phân tích từng bước chi tiết",
      "difficulty": "medium"
    }
  ]
}`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsed = await executeGeminiWithRetry(
      'generate-exercises',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return cleanAndParseGeminiJson<any>(response.text, 'generate-exercises');
      }
    );

    const rawExercises = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.exercises)
      ? parsed.exercises
      : null;

    if (rawExercises && rawExercises.length > 0) {
      aiSystemStatus.lastQuotaStatus = 'normal';
      aiSystemStatus.lastError = null;
      const cleaned = rawExercises
        .map((ex: any) => ({
          title: cleanAiResponse(ex.title || 'Bài tập thực hành'),
          question: cleanAiResponse(ex.question || ''),
          hint: cleanAiResponse(ex.hint || ''),
          solution: cleanAiResponse(ex.solution || ex.answerGuide || ''),
          answerGuide: cleanAiResponse(ex.answerGuide || ex.solution || ''),
          difficulty: ex.difficulty || 'medium',
        }))
        .filter((ex: any) => ex.question);

      if (cleaned.length === 0) {
        return res
          .status(502)
          .json(
            buildAiErrorResponse(
              'AI_INVALID_RESPONSE',
              'Dữ liệu bài tập trả về từ AI bị thiếu câu hỏi.'
            )
          );
      }

      if (targetLesson) {
        targetLesson.exercises = cleaned;
        targetLesson.updatedAt = new Date().toISOString();
        lessonStore.set(targetLesson.id, targetLesson);
      }

      return res.json(
        buildAiSuccessResponse({ exercises: cleaned }, { isRealAi: true })
      );
    }

    return res
      .status(502)
      .json(
        buildAiErrorResponse(
          'AI_INVALID_RESPONSE',
          'Không thể tạo bài tập từ tài liệu.',
          { canRetry: true }
        )
      );
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// ====================================================================
// Extract Deadlines: POST /api/ai/extract-deadlines
// ====================================================================
app.post('/api/ai/extract-deadlines', authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ctx = resolveTextContext(req);
    if (ctx.errorCode) {
      return res
        .status(ctx.errorStatus || 400)
        .json(buildAiErrorResponse(ctx.errorCode, ctx.errorMessage));
    }

    const { text, subjectName, title } = ctx;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Thiếu văn bản cần trích xuất deadline.',
            { canRetry: false }
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE, {
            canRetry: false,
          })
        );
    }

    const safeInput = truncateAiInputText(text, 15000);
    const prompt = `Phân tích văn bản học tập sau để tìm ra tất cả các deadline, bài tập, bài thi, thuyết trình.
Quy định định dạng: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Không sử dụng ký hiệu Markdown như dấu sao, dấu đô la làm delimiter công thức hoặc dòng gạch ngang. Không dùng ---, ***, ** hoặc bullet bắt đầu bằng dấu *. Nếu có công thức, viết công thức trực tiếp mà không bao quanh bằng dấu $.
Môn học: ${subjectName}
Tài liệu: ${title}

VĂN BẢN:
${safeInput}

Yêu cầu:
- Chỉ trích xuất khi có dấu hiệu thời gian rõ ràng (ngày, tháng, thứ).
- Không tự bịa ngày tháng nếu văn bản không đề cập.
- Trả về JSON mảng "deadlines". Mỗi phần tử gồm:
  * "title": Tên công việc
  * "dueDate": YYYY-MM-DD
  * "dueTime": Giờ (ví dụ 23:59 hoặc null)
  * "priority": 'urgent' | 'high' | 'medium' | 'low'
  * "type": 'assignment' | 'exam' | 'presentation' | 'project' | 'reading' | 'other'
  * "confidence": Số từ 0.5 đến 1.0
  * "sourceText": Câu chứa deadline`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsed = await executeGeminiWithRetry(
      'extract-deadlines',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                deadlines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                      dueTime: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      type: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      sourceText: { type: Type.STRING },
                    },
                    required: ['title', 'dueDate', 'priority', 'confidence', 'sourceText'],
                  },
                },
              },
              required: ['deadlines'],
            },
          },
        });

        return cleanAndParseGeminiJson<any>(response.text, 'extract-deadlines');
      }
    );

    aiSystemStatus.lastQuotaStatus = 'normal';
    aiSystemStatus.lastError = null;

    const cleanedDeadlines = (parsed?.deadlines || []).map((dl: any) => ({
      ...dl,
      title: cleanAiResponse(dl.title),
      sourceText: cleanAiResponse(dl.sourceText),
    }));

    return res.json(
      buildAiSuccessResponse({ deadlines: cleanedDeadlines }, { isRealAi: true })
    );
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// Comprehensive Lesson Analysis
app.post('/api/ai/analyze-lesson', authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const {
    transcript = '',
    title = 'Bài giảng',
    subjectName = 'Môn học',
    initialNotes = '',
    lessonId,
    subjectId,
    includeFlashcards = true,
    includeQuiz = true,
    includeMindMap = false,
  } = req.body;

  try {
    const existingLesson = lessonId ? lessonStore.get(lessonId) : undefined;
    if (existingLesson && !canAccessSharedOrOwned(existingLesson.ownerId, userId, existingLesson.id)) {
      return res
        .status(403)
        .json(
          buildAiErrorResponse(
            'FORBIDDEN',
            'Bạn không có quyền chỉnh sửa bài học này.'
          )
        );
    }

    const content = (transcript || existingLesson?.transcript || initialNotes || '').trim();

    if (!content) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Chưa có nội dung văn bản (transcript) để tạo bài học.'
          )
        );
    }

    const userIsPremium = isUserPremium(userId);
    if (includeMindMap === true && req.body.requirePremiumMindMap === true && !userIsPremium) {
      return res
        .status(403)
        .json(
          buildAiErrorResponse(
            'PREMIUM_REQUIRED',
            'Tính năng tạo Sơ đồ tư duy AI chỉ dành cho tài khoản Premium.'
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE)
        );
    }

    if (lessonId && existingLesson) {
      existingLesson.status = 'GENERATING_LESSON';
      existingLesson.analysisStatus = 'analyzing';
      lessonStore.set(lessonId, existingLesson);
    }

    const safeInput = truncateAiInputText(content, 16000);
    const prompt = `Bạn là trợ lý AI học tập cao cấp StudyMind AI cho sinh viên Việt Nam.
Quy định định dạng bắt buộc: Trả lời bằng tiếng Việt thuần túy, dễ đọc. Không sử dụng ký hiệu Markdown như dấu sao, dấu đô la làm delimiter công thức hoặc dòng gạch ngang. Không dùng ---, ***, ** hoặc bullet bắt đầu bằng dấu *. Sử dụng tiêu đề văn bản và danh sách đánh số. Nếu có công thức, viết công thức trực tiếp mà không bao quanh bằng dấu $.
Hãy phân tích nội dung bài giảng dưới đây và trả về định dạng JSON đúng chuẩn.

MÔN HỌC: ${subjectName}
TIÊU ĐỀ: ${title}
GHI CHÚ BAN ĐẦU: ${initialNotes}

NỘI DUNG BÀI GIẢNG / TRANSCRIPT:
${safeInput}

YÊU CẦU:
1. "summary": Tóm tắt ngắn từ 5 đến 8 câu bằng tiếng Việt tự nhiên, súc tích, trung thực với nội dung.
2. "keyPoints": Danh sách 3-5 ý chính, mỗi ý có "title", "content", và "importance" ('high'|'medium'|'low').
3. "keywords": Mảng 5-8 từ khóa quan trọng nhất.
4. "concepts": 2-4 khái niệm quan trọng nhất kèm "term", "definition", "example" (nếu có).
5. "mindMap": Cấu trúc cây sơ đồ tư duy gồm "title" (gốc) và "children" (các nhánh con phân cấp).
6. "flashcards": 4-6 thẻ ghi nhớ gồm "front", "back", "example", "difficulty" ('easy'|'medium'|'hard'), "topic".
7. "quizQuestions": 3-4 câu hỏi trắc nghiệm gồm "question", "options" (4 lựa chọn tiếng Việt), "correctAnswer" (chỉ số 0-3), "explanation" (giải thích chi tiết vì sao đúng), "difficulty" ('easy'|'medium'|'hard').
8. "deadlines": Tìm các hạn nộp bài, bài tập, kiểm tra, thuyết trình trong bài. KHÔNG ĐƯỢC TỰ BỊA DEADLINE nếu không có thông tin thời gian cụ thể. Mỗi deadline gồm "title", "dueDate" (định dạng YYYY-MM-DD), "dueTime" (nếu có ví dụ 23:59), "priority" ('urgent'|'high'|'medium'|'low'), "confidence" (0.0 đến 1.0), "sourceText".`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsed = await executeGeminiWithRetry(
      'analyze-lesson',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                keyPoints: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      content: { type: Type.STRING },
                      importance: { type: Type.STRING },
                    },
                    required: ['title', 'content', 'importance'],
                  },
                },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                concepts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      definition: { type: Type.STRING },
                      example: { type: Type.STRING },
                    },
                    required: ['term', 'definition'],
                  },
                },
                mindMap: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    children: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                        },
                      },
                    },
                  },
                  required: ['title'],
                },
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      example: { type: Type.STRING },
                      difficulty: { type: Type.STRING },
                      topic: { type: Type.STRING },
                    },
                    required: ['front', 'back', 'difficulty', 'topic'],
                  },
                },
                quizQuestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctAnswer: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                      difficulty: { type: Type.STRING },
                    },
                    required: ['question', 'options', 'correctAnswer', 'explanation', 'difficulty'],
                  },
                },
                deadlines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                      dueTime: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      sourceText: { type: Type.STRING },
                    },
                    required: ['title', 'dueDate', 'priority', 'confidence', 'sourceText'],
                  },
                },
              },
              required: ['summary', 'keyPoints', 'keywords', 'concepts', 'mindMap', 'flashcards', 'quizQuestions', 'deadlines'],
            },
          },
        });

        return cleanAndParseGeminiJson<any>(response.text, 'analyze-lesson');
      }
    );

    if (!parsed) {
      return res
        .status(502)
        .json(
          buildAiErrorResponse(
            'AI_INVALID_RESPONSE',
            'Không thể phân tích dữ liệu trả về từ AI.'
          )
        );
    }

    aiSystemStatus.lastQuotaStatus = 'normal';
    aiSystemStatus.lastError = null;

    parsed.summary = cleanAiResponse(parsed.summary);
    parsed.transcript = cleanAiResponse(content);

    if (Array.isArray(parsed.keyPoints)) {
      parsed.keyPoints.forEach((kp: any) => {
        kp.title = cleanAiResponse(kp.title);
        kp.content = cleanAiResponse(kp.content);
      });
    }
    if (Array.isArray(parsed.keywords)) {
      parsed.keywords = parsed.keywords.map((kw: string) => cleanAiResponse(kw));
    }
    if (Array.isArray(parsed.concepts)) {
      parsed.concepts.forEach((cp: any) => {
        cp.term = cleanAiResponse(cp.term);
        cp.definition = cleanAiResponse(cp.definition);
        if (cp.example) cp.example = cleanAiResponse(cp.example);
      });
    }
    if (parsed.mindMap) {
      parsed.mindMap = normalizeMindMapStructure(parsed.mindMap, title);
    }
    if (Array.isArray(parsed.flashcards)) {
      parsed.flashcards = includeFlashcards === false
        ? []
        : parsed.flashcards.map((fc: any, idx: number) => ({
            id: fc.id || `fc_${Date.now()}_${idx}`,
            front: cleanAiResponse(fc.front),
            back: cleanAiResponse(fc.back),
            example: fc.example ? cleanAiResponse(fc.example) : undefined,
            difficulty: fc.difficulty || 'medium',
            topic: cleanAiResponse(fc.topic || title),
          }));
    }
    if (Array.isArray(parsed.quizQuestions)) {
      parsed.quizQuestions = includeQuiz === false
        ? []
        : parsed.quizQuestions.map((q: any, idx: number) => ({
            id: q.id || `qz_${Date.now()}_${idx}`,
            question: cleanAiResponse(q.question),
            explanation: cleanAiResponse(q.explanation),
            options: Array.isArray(q.options) ? q.options.map((opt: string) => cleanAiResponse(opt)) : [],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            difficulty: q.difficulty || 'medium',
          }));
    }
    if (Array.isArray(parsed.deadlines)) {
      parsed.deadlines.forEach((dl: any) => {
        dl.title = cleanAiResponse(dl.title);
        if (dl.sourceText) dl.sourceText = cleanAiResponse(dl.sourceText);
      });
    }

    const targetLessonId = lessonId || `les_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const existing = lessonStore.get(targetLessonId);
    const resolvedSubjectId = subjectId || existing?.subjectId || 'sub_web_01';
    const resolvedTitle = title || existing?.title || 'Bài giảng';

    // Persist flashcards & quiz into global maps for workspace reload
    if (Array.isArray(parsed.flashcards)) {
      for (const fc of parsed.flashcards) {
        flashcardsMap.set(fc.id, {
          ...fc,
          ownerId: userId,
          subjectId: resolvedSubjectId,
          lessonId: targetLessonId,
          mastered: false,
          reviewCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }
    if (Array.isArray(parsed.quizQuestions) && parsed.quizQuestions.length > 0) {
      const quizId = `quiz_${targetLessonId}`;
      quizzesMap.set(quizId, {
        id: quizId,
        ownerId: userId,
        subjectId: resolvedSubjectId,
        lessonId: targetLessonId,
        title: `Trắc nghiệm: ${resolvedTitle}`,
        questions: parsed.quizQuestions,
        difficulty: 'medium',
        createdAt: new Date().toISOString(),
      });
    }
    if (parsed.mindMap && userIsPremium) {
      saveLessonMindMap(userId, targetLessonId, parsed.mindMap);
    }

    const savedLesson: StoredLesson = {
      ...(existing || {}),
      id: targetLessonId,
      ownerId: userId,
      subjectId: resolvedSubjectId,
      title: resolvedTitle,
      transcript: parsed.transcript,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      keywords: parsed.keywords,
      concepts: parsed.concepts,
      mindMap: parsed.mindMap,
      flashcards: parsed.flashcards,
      quizQuestions: parsed.quizQuestions,
      deadlines: parsed.deadlines,
      status: 'COMPLETED',
      analysisStatus: 'completed',
      summaryStatus: 'completed',
      transcriptionStatus: 'completed',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    lessonStore.set(targetLessonId, savedLesson);

    console.log('[AI_LESSON_SAVED]', {
      requestId: req.requestId,
      lessonId: targetLessonId,
      userId,
      status: 'COMPLETED',
      summaryLength: parsed.summary?.length || 0,
      flashcardsCount: parsed.flashcards?.length || 0,
      quizQuestionsCount: parsed.quizQuestions?.length || 0,
    });

    return res.json(
      buildAiSuccessResponse(
        {
          lessonId: targetLessonId,
          status: 'COMPLETED',
          lesson: savedLesson,
          result: parsed,
          ...parsed,
        },
        {
          isRealAi: true,
          lessonId: targetLessonId,
          status: 'COMPLETED',
        }
      )
    );
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    if (lessonId && lessonStore.has(lessonId)) {
      const l = lessonStore.get(lessonId)!;
      if (l.ownerId === userId) {
        l.status = parsed.isDailyQuota ? 'AI_QUOTA_EXCEEDED' : 'FAILED';
        l.analysisStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'failed';
        l.analysisError = parsed.message;
        l.updatedAt = new Date().toISOString();
        lessonStore.set(lessonId, l);
      }
    }

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
        lessonId,
      })
    );
  }
});

// ====================================================================
// Mind Map Generation & Management Endpoints (Requirement 4)
// ====================================================================

// Helper to normalize and ensure consistent mind map structure
function normalizeMindMapStructure(
  raw: any,
  fallbackTitle: string
): { id: string; title: string; label: string; nodes: any[]; children: any[] } {
  let title = raw?.title || raw?.label || fallbackTitle || 'Chủ đề chính';
  title = cleanAiResponse(title);

  let rootNode: any = null;
  if (Array.isArray(raw?.nodes) && raw.nodes.length > 0) {
    rootNode = raw.nodes[0];
  }

  const formatNode = (n: any, defaultId: string): any => {
    if (!n) return null;
    const label = cleanAiResponse(n.label || n.title || 'Ý chính');
    const id = String(n.id || defaultId);
    const childrenRaw = Array.isArray(n.children) ? n.children : Array.isArray(n.nodes) ? n.nodes : [];
    const children = childrenRaw
      .map((child: any, idx: number) => formatNode(child, `${id}-${idx + 1}`))
      .filter(Boolean);

    return {
      id,
      label,
      title: label,
      children,
    };
  };

  let formattedRoot: any = null;
  if (rootNode) {
    formattedRoot = formatNode(rootNode, 'root');
  } else if (raw?.children || raw?.title || raw?.label) {
    formattedRoot = formatNode(raw, 'root');
  } else {
    formattedRoot = {
      id: 'root',
      label: title,
      title,
      children: [],
    };
  }

  return {
    id: formattedRoot.id || 'root',
    title,
    label: formattedRoot.label || title,
    nodes: [formattedRoot],
    children: formattedRoot.children || [],
  };
}

// POST /api/lessons/:id/mindmap (Generate or regenerate mind map for a lesson)
app.post('/api/lessons/:id/mindmap', authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const lessonId = req.params.id;

    // 1. Check lesson and ownership
    const lesson = lessonStore.get(lessonId);
    if (!lesson) {
      return res
        .status(404)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Không tìm thấy bài học để tạo sơ đồ tư duy.'
          )
        );
    }

    if (lesson.ownerId !== userId) {
      return res
        .status(403)
        .json(
          buildAiErrorResponse(
            'FORBIDDEN',
            'Bạn không có quyền truy cập bài học này.'
          )
        );
    }

    // 2. Check Premium account at backend (Requirement 4 & 5)
    if (!isUserPremium(userId)) {
      return res
        .status(403)
        .json(
          buildAiErrorResponse(
            'PREMIUM_REQUIRED',
            'Tính năng tạo Sơ đồ tư duy AI chỉ dành cho tài khoản Premium.'
          )
        );
    }

    // 3. Input text priority: custom text in body -> lesson transcript -> lesson summary
    const sourceText = (req.body.text || lesson.transcript || lesson.summary || '').trim();
    if (!sourceText) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Nội dung bài học hiện đang rỗng. Vui lòng cung cấp văn bản hoặc phiên âm bài giảng trước khi tạo sơ đồ tư duy.'
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(
          buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE)
        );
    }

    const subject = lesson.subjectId ? subjectStore.get(lesson.subjectId) : null;
    const subjectName = subject?.name || 'Môn học';
    const safeInput = truncateAiInputText(sourceText, 15000);

    const prompt = `Bạn là chuyên gia sư phạm và trợ lý học tập StudyMind AI.
Hãy phân tích nội dung sau để tạo ra một sơ đồ tư duy (Mind Map) chi tiết, logic, phân cấp chặt chẽ bằng tiếng Việt.
Môn học: ${subjectName}
Chủ đề bài học: ${lesson.title}

NỘI DUNG THAM KHẢO:
${safeInput}

QUY ĐỊNH BẮT BUỘC:
1. Trả lời bằng JSON thuần túy theo cấu trúc chuẩn. Tuyệt đối KHÔNG bọc bằng markdown (\`\`\`) nếu không cần thiết, KHÔNG có lời dẫn hay giải thích bên ngoài JSON.
2. Không dùng ký hiệu Markdown như *, **, $, # trong tiêu đề hoặc nhãn.
3. Cấu trúc JSON gồm "title" (chủ đề trung tâm) và mảng "nodes" chứa node gốc:
{
  "title": "${lesson.title}",
  "nodes": [
    {
      "id": "root",
      "label": "${lesson.title}",
      "children": [
        {
          "id": "child-1",
          "label": "Tên nhánh chính 1",
          "children": [
            {
              "id": "child-1-1",
              "label": "Nội dung chi tiết 1.1",
              "children": []
            }
          ]
        },
        {
          "id": "child-2",
          "label": "Tên nhánh chính 2",
          "children": []
        }
      ]
    }
  ]
}`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsedAi = await executeGeminiWithRetry(
      'generate-mindmap',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        return cleanAndParseGeminiJson<any>(response.text, 'generate-mindmap');
      }
    );

    if (!parsedAi || (!parsedAi.nodes && !parsedAi.children && !parsedAi.title)) {
      return res
        .status(502)
        .json(
          buildAiErrorResponse(
            'AI_INVALID_RESPONSE',
            'AI không thể tạo cấu trúc sơ đồ tư duy từ nội dung bài học. Vui lòng thử lại.'
          )
        );
    }

    const normalizedMap = normalizeMindMapStructure(parsedAi, lesson.title);

    // Persist mind map in unified store associated with userId and lessonId
    lesson.mindMap = normalizedMap;
    lesson.updatedAt = new Date().toISOString();
    lessonStore.set(lessonId, lesson);
    saveLessonMindMap(userId, lessonId, normalizedMap);

    aiSystemStatus.lastQuotaStatus = 'normal';
    aiSystemStatus.lastError = null;

    return res.json(
      buildAiSuccessResponse(
        {
          mindMap: normalizedMap,
          title: normalizedMap.title,
          nodes: normalizedMap.nodes,
          children: normalizedMap.children,
        },
        {
          result: normalizedMap,
          message: 'Đã tạo sơ đồ tư duy thành công từ bài học!',
          isRealAi: true,
        }
      )
    );
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    aiSystemStatus.lastQuotaStatus = parsed.isDailyQuota ? 'quota_exceeded' : 'server_error';
    aiSystemStatus.lastError = parsed.message;
    aiSystemStatus.lastErrorCode = parsed.errorCode;
    aiSystemStatus.retryAfter = parsed.retryAfter || null;

    return res.status(parsed.httpStatus || 500).json(
      buildAiErrorResponse(parsed.errorCode, parsed.message, {
        retryAfter: parsed.retryAfter,
        canRetry: parsed.canRetry,
      })
    );
  }
});

// GET /api/lessons/:id/mindmap (Get saved mind map)
app.get('/api/lessons/:id/mindmap', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const result = getLessonMindMap(userId, req.params.id);
  if (!result.success) {
    return res
      .status(result.errorCode === 'FORBIDDEN' ? 403 : 404)
      .json(buildAiErrorResponse(result.errorCode || 'FORBIDDEN', result.message));
  }

  return res.json({
    success: true,
    mindMap: result.mindMap,
    result: result.mindMap,
    data: result.mindMap,
    error: null,
    lessonTitle: result.lessonTitle,
  });
});

// DELETE /api/lessons/:id/mindmap & DELETE /api/mindmaps/:id (Delete mind map)
app.delete(['/api/lessons/:id/mindmap', '/api/mindmaps/:id'], authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const lessonId = req.params.id;

  const lesson = lessonStore.get(lessonId);
  if (lesson && lesson.ownerId === userId) {
    lesson.mindMap = undefined;
    lesson.updatedAt = new Date().toISOString();
    lessonStore.set(lessonId, lesson);
  }

  const result = deleteLessonMindMap(userId, lessonId);
  if (!result.success) {
    return res
      .status(result.errorCode === 'FORBIDDEN' ? 403 : 404)
      .json(buildAiErrorResponse(result.errorCode || 'FORBIDDEN', result.message));
  }

  return res.json({
    success: true,
    data: { deleted: true },
    error: null,
    message: 'Đã xóa sơ đồ tư duy thành công.',
  });
});

// Standalone Mindmap generation: POST /api/ai/mindmap (accepts text, documentId, or lessonId)
app.post('/api/ai/mindmap', authenticateUser, checkAiQuota, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { documentId, lessonId, text: rawText, title: rawTitle = 'Sơ đồ tư duy' } = req.body;

    let sourceText = (rawText || '').trim();
    let title = rawTitle;

    if (documentId) {
      const doc = documentStore.get(documentId);
      if (!doc) {
        return res
          .status(404)
          .json(buildAiErrorResponse('DOCUMENT_TEXT_EMPTY', 'Không tìm thấy tài liệu.'));
      }
      if (doc.ownerId !== userId) {
        return res
          .status(403)
          .json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền truy cập tài liệu này.'));
      }
      sourceText = doc.extractedText || doc.summary || sourceText;
      title = doc.fileName || title;
    } else if (lessonId) {
      const lesson = lessonStore.get(lessonId);
      if (!lesson) {
        return res
          .status(404)
          .json(buildAiErrorResponse('AI_INPUT_EMPTY', 'Không tìm thấy bài học.'));
      }
      if (lesson.ownerId !== userId) {
        return res
          .status(403)
          .json(buildAiErrorResponse('FORBIDDEN', 'Bạn không có quyền truy cập bài học này.'));
      }
      sourceText = lesson.transcript || lesson.summary || sourceText;
      title = lesson.title || title;
    }

    if (!isUserPremium(userId)) {
      return res
        .status(403)
        .json(
          buildAiErrorResponse(
            'PREMIUM_REQUIRED',
            'Tính năng tạo Sơ đồ tư duy AI chỉ dành cho tài khoản Premium.'
          )
        );
    }

    if (!sourceText) {
      return res
        .status(400)
        .json(
          buildAiErrorResponse(
            'AI_INPUT_EMPTY',
            'Nội dung đầu vào không được để trống.'
          )
        );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res
        .status(503)
        .json(buildAiErrorResponse('AI_NOT_CONFIGURED', GEMINI_MISSING_KEY_MESSAGE));
    }

    const safeInput = truncateAiInputText(sourceText, 15000);
    const prompt = `Hãy tạo một sơ đồ tư duy (Mind Map) chi tiết, phân cấp rõ ràng bằng tiếng Việt từ nội dung sau:
CHỦ ĐỀ: ${title}
NỘI DUNG:
${safeInput}

Quy định bắt buộc:
Trả về JSON chuẩn không có markdown:
{
  "title": "${title}",
  "nodes": [
    {
      "id": "root",
      "label": "${title}",
      "children": [
        {
          "id": "child-1",
          "label": "Nhánh chính 1",
          "children": []
        }
      ]
    }
  ]
}`;

    aiSystemStatus.lastRequestAt = new Date().toISOString();

    const parsedAi = await executeGeminiWithRetry(
      'standalone-mindmap',
      async (client, modelName) => {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return cleanAndParseGeminiJson<any>(response.text, 'standalone-mindmap');
      }
    );

    if (!parsedAi || (!parsedAi.nodes && !parsedAi.children && !parsedAi.title)) {
      return res
        .status(502)
        .json(
          buildAiErrorResponse(
            'AI_INVALID_RESPONSE',
            'Không thể tạo sơ đồ tư duy từ nội dung đã cung cấp.'
          )
        );
    }

    const normalized = normalizeMindMapStructure(parsedAi, title);

    if (lessonId) {
      saveLessonMindMap(userId, lessonId, normalized);
      const l = lessonStore.get(lessonId);
      if (l && l.ownerId === userId) {
        l.mindMap = normalized;
        lessonStore.set(lessonId, l);
      }
    }

    return res.json(
      buildAiSuccessResponse(
        {
          mindMap: normalized,
          title: normalized.title,
          nodes: normalized.nodes,
          children: normalized.children,
        },
        {
          result: normalized,
          isRealAi: true,
        }
      )
    );
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    return res
      .status(parsed.httpStatus || 500)
      .json(buildAiErrorResponse(parsed.errorCode, parsed.message));
  }
});

// Legacy Document upload helper for backward compatibility
app.post('/api/upload', (req: Request, res: Response) => {
  const { fileName, fileType, fileSize, content } = req.body;
  if (!fileName) {
    return res.status(400).json({ error: 'Thiếu tên file' });
  }

  if (fileSize && fileSize > 25 * 1024 * 1024) {
    return res.status(400).json({ error: 'Kích thước file vượt quá giới hạn cho phép (25MB)' });
  }

  res.json({
    success: true,
    fileUrl: `blob:local/${encodeURIComponent(fileName)}`,
    fileName,
    fileType,
    fileSize,
    extractedPreview: typeof content === 'string' ? content.slice(0, 500) : '',
  });
});

// ====================================================================
// MoMo & ZaloPay Payment Gateway Endpoints (PHẦN 11, 12, 13)
// ====================================================================

// Create MoMo Payment Order: POST /api/payments/momo/create
app.post('/api/payments/momo/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { plan = 'premium_monthly', billingCycle = 'monthly' } = req.body;
    const isYearly = plan === 'premium_yearly' || billingCycle === 'yearly';
    const amount = isYearly ? 699000 : 79000;
    const userEmail = req.user?.email || 'student@studysync.vn';

    const orderId = `MOMO_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const returnUrl = `${baseUrl}/?tab=checkout&orderId=${orderId}`;
    const notifyUrl = process.env.MOMO_NOTIFY_URL || `${baseUrl}/api/payments/momo/notify`;

    // 1. Create Pending Transaction in Database (status: pending, NEVER mark premium here)
    const pendingTx = createPendingTransaction({
      userId,
      plan: isYearly ? 'premium_yearly' : 'premium_monthly',
      amount,
      provider: 'momo',
      orderId,
      paymentMethod: 'Ví điện tử MoMo',
    });

    // 2. Call MoMo Provider to generate payment URL / QR
    const paymentResult = await momoProvider.createPayment({
      userId,
      userEmail,
      plan: isYearly ? 'premium_yearly' : 'premium_monthly',
      billingCycle: isYearly ? 'yearly' : 'monthly',
      amount,
      orderId,
      returnUrl,
      notifyUrl,
      clientIp: req.ip,
    });

    return res.json({
      success: true,
      orderId,
      transactionId: pendingTx.id,
      amount,
      plan: isYearly ? 'premium_yearly' : 'premium_monthly',
      payUrl: paymentResult.payUrl,
      qrCodeUrl: paymentResult.qrCodeUrl,
      mode: paymentResult.mode,
      message: 'Giao dịch MoMo đã được tạo. Vui lòng hoàn tất thanh toán.',
    });
  } catch (err: any) {
    console.error('[MoMo Create Error]', err);
    return res.status(500).json({
      success: false,
      errorCode: 'MOMO_CREATE_FAILED',
      message: 'Không thể tạo đơn hàng MoMo: ' + err.message,
    });
  }
});

// MoMo IPN Callback: POST /api/payments/momo/notify
app.post('/api/payments/momo/notify', async (req: Request, res: Response) => {
  try {
    console.log('[MoMo IPN Callback Received]', req.body);
    const verification = momoProvider.verifyCallback(req.body);

    if (!verification.isValid || !verification.orderId) {
      console.warn('[MoMo IPN Signature Verification Failed]', verification.message);
      return res.status(400).json({ message: verification.message || 'Chữ ký không hợp lệ' });
    }

    const { orderId, transId, amount, resultCode } = verification;
    const existingTx = getTransactionByOrderId(orderId);

    if (!existingTx) {
      console.warn(`[MoMo IPN Warning] Không tìm thấy đơn hàng: ${orderId}`);
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Only activate Premium when resultCode === 0 (Success)
    if (resultCode === 0) {
      const upgradeResult = confirmPaymentAndUpgrade({
        orderId,
        provider: 'momo',
        providerTransactionId: transId,
        amount,
      });

      console.log(`🎉 [MoMo Paid Verified] Gói Premium kích hoạt cho user ${upgradeResult.transaction.userId} (Order: ${orderId})`);
      return res.status(204).send();
    } else {
      existingTx.status = 'failed';
      existingTx.failureReason = verification.message || `Mã lỗi MoMo: ${resultCode}`;
      existingTx.updatedAt = new Date().toISOString();
      console.warn(`⚠️ [MoMo Payment Failed] Order: ${orderId}, Code: ${resultCode}`);
      return res.status(200).json({ message: 'Đã ghi nhận giao dịch thất bại' });
    }
  } catch (err: any) {
    console.error('[MoMo Notify Error]', err);
    return res.status(500).json({ message: 'Lỗi xử lý callback' });
  }
});

// MoMo Simulate Success (Sandbox testing helper): POST /api/payments/momo/simulate-success
app.post('/api/payments/momo/simulate-success', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng' });
  }

  const tx = getTransactionByOrderId(orderId);
  if (!tx || tx.userId !== req.userId) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch hợp lệ của bạn.' });
  }

  const fakeTransId = `momo_sim_${Date.now()}`;
  const upgradeResult = confirmPaymentAndUpgrade({
    orderId,
    provider: 'momo',
    providerTransactionId: fakeTransId,
  });

  return res.json({
    success: true,
    message: 'Thanh toán MoMo đã được xác nhận. Gói Premium đã được kích hoạt.',
    subscription: upgradeResult.subscription,
    transaction: upgradeResult.transaction,
  });
});

// Create ZaloPay Payment Order: POST /api/payments/zalopay/create
app.post('/api/payments/zalopay/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { plan = 'premium_monthly', billingCycle = 'monthly' } = req.body;
    const isYearly = plan === 'premium_yearly' || billingCycle === 'yearly';
    const amount = isYearly ? 699000 : 79000;
    const userEmail = req.user?.email || 'student@studysync.vn';

    const orderId = `ZLP_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const returnUrl = `${baseUrl}/?tab=checkout&orderId=${orderId}`;
    const notifyUrl = process.env.ZALOPAY_CALLBACK_URL || `${baseUrl}/api/payments/zalopay/callback`;

    // 1. Create Pending Transaction
    const pendingTx = createPendingTransaction({
      userId,
      plan: isYearly ? 'premium_yearly' : 'premium_monthly',
      amount,
      provider: 'zalopay',
      orderId,
      paymentMethod: 'Ví điện tử ZaloPay',
    });

    // 2. Call ZaloPay Provider
    const paymentResult = await zalopayProvider.createPayment({
      userId,
      userEmail,
      plan: isYearly ? 'premium_yearly' : 'premium_monthly',
      billingCycle: isYearly ? 'yearly' : 'monthly',
      amount,
      orderId,
      returnUrl,
      notifyUrl,
      clientIp: req.ip,
    });

    return res.json({
      success: true,
      orderId,
      transactionId: pendingTx.id,
      amount,
      plan: isYearly ? 'premium_yearly' : 'premium_monthly',
      payUrl: paymentResult.payUrl,
      qrCodeUrl: paymentResult.qrCodeUrl,
      mode: paymentResult.mode,
      message: 'Giao dịch ZaloPay đã được tạo. Vui lòng hoàn tất thanh toán.',
    });
  } catch (err: any) {
    console.error('[ZaloPay Create Error]', err);
    return res.status(500).json({
      success: false,
      errorCode: 'ZALOPAY_CREATE_FAILED',
      message: 'Không thể tạo đơn hàng ZaloPay: ' + err.message,
    });
  }
});

// ZaloPay Callback: POST /api/payments/zalopay/callback
app.post('/api/payments/zalopay/callback', async (req: Request, res: Response) => {
  try {
    console.log('[ZaloPay Callback Received]', req.body);
    const verification = zalopayProvider.verifyCallback(req.body);

    if (!verification.isValid || !verification.orderId) {
      console.warn('[ZaloPay Callback MAC Verification Failed]', verification.message);
      return res.json({ return_code: -1, return_message: verification.message || 'mac not equal' });
    }

    const { orderId, appTransId, amount } = verification;
    const upgradeResult = confirmPaymentAndUpgrade({
      orderId,
      provider: 'zalopay',
      providerTransactionId: appTransId,
      amount,
    });

    console.log(`🎉 [ZaloPay Paid Verified] Gói Premium kích hoạt cho user ${upgradeResult.transaction.userId} (Order: ${orderId})`);
    return res.json({ return_code: 1, return_message: 'success' });
  } catch (err: any) {
    console.error('[ZaloPay Callback Error]', err);
    return res.json({ return_code: 0, return_message: 'error: ' + err.message });
  }
});

// ZaloPay Simulate Success (Sandbox testing helper): POST /api/payments/zalopay/simulate-success
app.post('/api/payments/zalopay/simulate-success', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng' });
  }

  const tx = getTransactionByOrderId(orderId);
  if (!tx || tx.userId !== req.userId) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch hợp lệ của bạn.' });
  }

  const fakeTransId = `zlp_sim_${Date.now()}`;
  const upgradeResult = confirmPaymentAndUpgrade({
    orderId,
    provider: 'zalopay',
    providerTransactionId: fakeTransId,
  });

  return res.json({
    success: true,
    message: 'Thanh toán ZaloPay đã được xác nhận. Gói Premium đã được kích hoạt.',
    subscription: upgradeResult.subscription,
    transaction: upgradeResult.transaction,
  });
});

// Transaction Status Polling: GET /api/transactions/status/:orderId
app.get('/api/transactions/status/:orderId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.params;
  const tx = getTransactionByOrderId(orderId);
  if (!tx || tx.userId !== req.userId) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin giao dịch.' });
  }

  const sub = getUserSubscription(req.userId!);
  return res.json({
    success: true,
    orderId: tx.orderId,
    status: tx.status,
    plan: tx.plan,
    amount: tx.amount,
    provider: tx.provider,
    paidAt: tx.paidAt,
    isPremium: sub.plan === 'premium' && sub.status === 'active',
  });
});

// ====================================================================
// Billing, Subscriptions & Transactions Endpoints (PHẦN 8, 9, 10, 11)
// ====================================================================

// Get Current User Subscription: GET /api/billing/subscription
app.get('/api/billing/subscription', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sub = getUserSubscription(req.userId!);
  const isPremiumValid = isUserPremium(req.userId!);
  return res.json({
    ...sub,
    hasActivePremiumAccess: isPremiumValid,
  });
});

// Backward compatible subscription by userId
app.get('/api/billing/subscription/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const sub = getUserSubscription(userId);
  const isPremiumValid = isUserPremium(userId);
  return res.json({
    ...sub,
    hasActivePremiumAccess: isPremiumValid,
  });
});

// Create Checkout Session: POST /api/billing/create-checkout-session
app.post('/api/billing/create-checkout-session', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { planType = 'monthly' } = req.body;
    const userEmail = req.user?.email || 'student@studymind.vn';
    const amount = planType === 'yearly' ? 699000 : 79000;

    // 1. Create a pending transaction record in database
    const pendingTx = createPendingTransaction({
      userId,
      plan: planType === 'yearly' ? 'premium_yearly' : 'premium_monthly',
      amount,
      provider: 'stripe',
      paymentMethod: 'Stripe Checkout',
    });

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // 2. If real Stripe key is provided, create Stripe checkout session
    if (stripeKey && stripeKey.startsWith('sk_')) {
      try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' as any });

        const priceId =
          planType === 'yearly'
            ? process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID
            : process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer_email: userEmail,
          client_reference_id: userId,
          metadata: { userId, planType, transactionId: pendingTx.id },
          line_items: [
            priceId
              ? { price: priceId, quantity: 1 }
              : {
                  price_data: {
                    currency: 'vnd',
                    product_data: {
                      name: `StudyMind AI Premium (${planType === 'yearly' ? 'Theo Năm' : 'Theo Tháng'})`,
                      description: 'Mở khóa không giới hạn môn học, 3000 phút ghi âm bài giảng và trợ lý AI cao cấp.',
                    },
                    unit_amount: planType === 'yearly' ? 69900000 : 7900000,
                    recurring: {
                      interval: planType === 'yearly' ? 'year' : 'month',
                    },
                  },
                  quantity: 1,
                },
          ],
          success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment_status=success&session_id={CHECKOUT_SESSION_ID}&tx_id=${pendingTx.id}`,
          cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment_status=cancelled&tx_id=${pendingTx.id}`,
        });

        return res.json({
          mode: 'live_stripe',
          checkoutUrl: session.url,
          sessionId: session.id,
          transactionId: pendingTx.id,
          message: 'Đã tạo phiên thanh toán Stripe thành công.',
        });
      } catch (stripeErr: any) {
        console.warn('⚠️ Stripe API error, switching to test mode checkout:', stripeErr.message);
      }
    }

    // 3. Test Mode / Simulated Payment session
    return res.json({
      mode: 'test_mode',
      simulatedCheckout: true,
      transactionId: pendingTx.id,
      planType,
      message: 'Hệ thống đang chạy chế độ thanh toán Test Mode (Thử nghiệm). Nhấn "Xác nhận thanh toán Test Mode" để kích hoạt gói và tạo hóa đơn.',
    });
  } catch (error: any) {
    console.error('Lỗi khi tạo phiên thanh toán:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tạo phiên thanh toán: ' + error?.message });
  }
});

// Confirm Payment in Test Mode / Simulation: POST /api/billing/confirm-test-payment
app.post('/api/billing/confirm-test-payment', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { planType = 'monthly', transactionId } = req.body;

  const result = confirmPaymentAndUpgrade({
    userId,
    planType,
    provider: 'test',
    transactionId,
  });

  return res.json({
    success: true,
    subscription: result.subscription,
    transaction: result.transaction,
    message: result.message,
  });
});

// Stripe Webhook: POST /api/stripe/webhook
app.post('/api/stripe/webhook', async (req: Request, res: Response) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: any = req.body;

  if (stripeKey && webhookSecret) {
    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' as any });
      const sig = req.headers['stripe-signature'] as string;
      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      console.log('✅ Stripe Webhook signature verified successfully! Event:', event.type);
    } catch (err: any) {
      console.error('⚠️ Stripe Webhook verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const planType = (session.metadata?.planType as 'monthly' | 'yearly') || 'monthly';
        const transactionId = session.metadata?.transactionId;

        if (userId) {
          confirmPaymentAndUpgrade({
            userId,
            planType,
            provider: 'stripe',
            transactionId,
            providerTransactionId: session.id,
            providerCustomerId: session.customer,
            providerSubscriptionId: session.subscription,
          });
          console.log(`🎉 Premium activated for user ${userId} via Stripe Webhook!`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`💰 Invoice payment succeeded for customer ${invoice.customer}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log(`❌ Subscription deleted for customer ${sub.customer}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error('Error processing Stripe webhook:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Cancel Subscription: POST /api/billing/cancel-subscription
app.post('/api/billing/cancel-subscription', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const result = cancelUserSubscription(req.userId!);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    });
  }

  return res.json({
    success: true,
    subscription: result.subscription,
    message: result.message,
  });
});

// User Transactions History: GET /api/transactions
app.get('/api/transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const transactions = getUserTransactions(req.userId!);
  return res.json({
    success: true,
    transactions,
  });
});

// Single Transaction Details: GET /api/transactions/:id
app.get('/api/transactions/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tx = getTransactionById(req.userId!, req.params.id);
  if (!tx) {
    return res.status(404).json({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Không tìm thấy giao dịch hoặc bạn không có quyền xem giao dịch này.',
    });
  }

  return res.json({
    success: true,
    transaction: tx,
  });
});

// Legacy simulation endpoint
app.post('/api/billing/simulate-checkout-success', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { planType = 'monthly', transactionId } = req.body;
  const result = confirmPaymentAndUpgrade({
    userId: req.userId!,
    planType,
    provider: 'test',
    transactionId,
  });
  return res.json({
    success: true,
    subscription: result.subscription,
    message: `Đã kích hoạt thành công gói Premium ${planType === 'yearly' ? '1 Năm' : '1 Tháng'}!`,
  });
});

// ====================================================================
// Bank Transfer & Order Management Endpoints (Requirement 1, 2, 3, 4, 5, 8)
// ====================================================================

// Public Bank Config Endpoint (Requirement 2): No sensitive secrets exposed!
app.get('/api/payments/bank-config', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    bankName: process.env.PAYMENT_BANK_NAME || 'TPBank',
    accountNumber: process.env.PAYMENT_BANK_ACCOUNT_NUMBER || '00000493116',
    accountName: process.env.PAYMENT_BANK_ACCOUNT_NAME || 'DINH THI HUYEN ANH',
    qrImageUrl: process.env.PAYMENT_QR_IMAGE_URL || '/images/tpbank_qr.png',
    momoQrUrl: process.env.PAYMENT_MOMO_QR_IMAGE_URL || '/images/momo_qr.png',
    zalopayQrUrl: process.env.PAYMENT_ZALOPAY_QR_IMAGE_URL || '/images/zalopay_qr.png',
    instructions: process.env.PAYMENT_INSTRUCTIONS || 'Vui lòng ghi đúng mã đơn hàng trong nội dung chuyển khoản.',
  });
});

// POST /api/orders (Create Order when clicking "Mua ngay")
app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { packageId = 'premium_monthly', provider = 'bank' } = req.body;

    const validPackageId: 'premium_monthly' | 'premium_yearly' =
      packageId === 'premium_yearly' ? 'premium_yearly' : 'premium_monthly';
    const validProvider: 'bank' | 'momo' | 'zalopay' | 'stripe' | 'test' =
      ['bank', 'momo', 'zalopay', 'stripe', 'test'].includes(provider) ? provider : 'bank';

    const orderResult = createOrder({
      userId,
      packageId: validPackageId,
      provider: validProvider,
    });

    const order = orderResult.order;
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const checkoutUrl = `${baseUrl}/checkout/${order.id}`;

    let payUrl = `${baseUrl}/checkout/${order.id}`;
    let qrCodeUrl: string | undefined = undefined;

    if (validProvider === 'momo') {
      const returnUrl = `${baseUrl}/checkout/${order.id}`;
      const notifyUrl = process.env.MOMO_NOTIFY_URL || `${baseUrl}/api/payments/momo/notify`;
      const momoRes = await momoProvider.createPayment({
        userId,
        userEmail: req.user?.email || 'student@studysync.vn',
        plan: validPackageId,
        billingCycle: validPackageId === 'premium_yearly' ? 'yearly' : 'monthly',
        amount: order.amount,
        orderId: order.id,
        returnUrl,
        notifyUrl,
        clientIp: req.ip,
      });
      payUrl = momoRes.payUrl;
      qrCodeUrl = momoRes.qrCodeUrl;
    } else if (validProvider === 'zalopay') {
      const returnUrl = `${baseUrl}/checkout/${order.id}`;
      const notifyUrl = process.env.ZALOPAY_CALLBACK_URL || `${baseUrl}/api/payments/zalopay/callback`;
      const zlpRes = await zalopayProvider.createPayment({
        userId,
        userEmail: req.user?.email || 'student@studysync.vn',
        plan: validPackageId,
        billingCycle: validPackageId === 'premium_yearly' ? 'yearly' : 'monthly',
        amount: order.amount,
        orderId: order.id,
        returnUrl,
        notifyUrl,
        clientIp: req.ip,
      });
      payUrl = zlpRes.payUrl;
      qrCodeUrl = zlpRes.qrCodeUrl;
    }

    if (payUrl || qrCodeUrl) {
      updateOrderStatus(order.id, order.status, { payUrl, qrCodeUrl });
    }

    return res.status(201).json({
      success: true,
      order: {
        ...order,
        payUrl,
        qrCodeUrl,
      },
      checkoutUrl,
      alreadyExists: orderResult.alreadyExists,
      message: orderResult.message,
    });
  } catch (err: any) {
    console.error('[Create Order Error]', err);
    return res.status(500).json({
      success: false,
      errorCode: 'ORDER_CREATION_FAILED',
      message: 'Không thể tạo đơn hàng: ' + (err.message || 'Lỗi không xác định'),
    });
  }
});

// GET /api/orders/:id (Retrieve specific order with ownership enforcement or admin access)
app.get('/api/orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const isAdmin = req.user?.role === 'admin' || userId === 'usr_demo_101';
  const order = getOrderById(req.params.id, userId, isAdmin);

  if (!order) {
    return res.status(404).json({
      success: false,
      errorCode: 'ORDER_NOT_FOUND',
      message: 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn hàng này.',
    });
  }

  return res.json({
    success: true,
    order,
  });
});

// GET /api/orders (List current user's orders)
app.get('/api/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orders = getUserOrders(req.userId!);
  return res.json({
    success: true,
    orders,
  });
});

// POST /api/orders/:orderId/confirm-payment (Customer marks "Tôi đã thanh toán")
// REQUIREMENT 4 & 5: Does NOT activate Premium! Moves to WAITING_VERIFICATION
app.post('/api/orders/:orderId/confirm-payment', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const result = customerConfirmOrderPayment(req.params.orderId, userId);

  if (!result.success) {
    return res.status(result.errorCode === 'ORDER_NOT_FOUND' ? 404 : result.errorCode === 'FORBIDDEN' ? 403 : 400).json({
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    });
  }

  return res.json({
    success: true,
    order: result.order,
    message: result.message,
  });
});

// POST /api/orders/:orderId/receipt (Upload payment receipt screenshot)
app.post('/api/orders/:orderId/receipt', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  uploadReceiptDisk.single('receipt')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Lỗi khi tải lên ảnh biên lai.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh biên lai hợp lệ (JPG, PNG, WEBP, tối đa 10MB).',
      });
    }

    const filename = path.basename(req.file.path);
    const receiptUrl = `/api/receipts/${req.params.orderId}/${filename}`;
    const result = attachOrderReceipt(req.params.orderId, req.userId!, receiptUrl);

    if (!result.success) {
      return res.status(result.errorCode === 'ORDER_NOT_FOUND' ? 404 : 400).json(result);
    }

    return res.json({
      success: true,
      receiptUrl,
      order: result.order,
      message: 'Ảnh biên lai đã được tải lên thành công.',
    });
  });
});

// GET /api/receipts/:orderId/:filename (Serve uploaded receipt file securely)
app.get('/api/receipts/:orderId/:filename', (req: Request, res: Response) => {
  const { orderId, filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(receiptUploadDir, orderId, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Ảnh biên lai không tồn tại.' });
  }

  let mimeType = 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (filePath.endsWith('.webp')) mimeType = 'image/webp';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(filePath).pipe(res);
});

// ====================================================================
// Admin Order Verification Endpoints (Requirement 4 & 5)
// ====================================================================

// GET /api/admin/orders
app.get('/api/admin/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const isAdmin = user?.role === 'admin' || user?.id === 'usr_demo_101';

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Bạn không có quyền truy cập trang quản trị đơn hàng.',
    });
  }

  const statusFilter = req.query.status as string | undefined;
  const orders = getAllAdminOrders(statusFilter);

  return res.json({
    success: true,
    orders,
    waitingCount: orders.filter((o) => o.status === 'WAITING_VERIFICATION').length,
  });
});

// POST /api/admin/orders/:orderId/approve (Admin approves and safely activates Premium)
app.post('/api/admin/orders/:orderId/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const isAdmin = user?.role === 'admin' || user?.id === 'usr_demo_101';

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Chỉ Quản trị viên mới được duyệt kích hoạt Premium.',
    });
  }

  const result = adminApproveOrder(req.params.orderId, req.userId!);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// POST /api/admin/orders/:orderId/reject (Admin rejects order with reason)
app.post('/api/admin/orders/:orderId/reject', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const isAdmin = user?.role === 'admin' || user?.id === 'usr_demo_101';

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Chỉ Quản trị viên mới được thao tác từ chối đơn hàng.',
    });
  }

  const { reason } = req.body;
  const result = adminRejectOrder(req.params.orderId, req.userId!, reason);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// Generic payment create: POST /api/payments/create
app.post('/api/payments/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { orderId, packageId = 'premium_monthly', provider = 'bank' } = req.body;

    let targetOrder = orderId ? getOrderById(orderId, userId) : null;
    if (!targetOrder) {
      const created = createOrder({
        userId,
        packageId: packageId === 'premium_yearly' ? 'premium_yearly' : 'premium_monthly',
        provider,
      });
      targetOrder = created.order;
    }

    if (targetOrder.status === 'PAID') {
      return res.status(400).json({
        success: false,
        errorCode: 'ORDER_ALREADY_PAID',
        message: 'Đơn hàng này đã được thanh toán thành công.',
      });
    }

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    let payUrl = `${baseUrl}/checkout/${targetOrder.id}`;
    let qrCodeUrl: string | undefined = undefined;

    if (provider === 'momo') {
      const momoRes = await momoProvider.createPayment({
        userId,
        userEmail: req.user?.email || 'student@studysync.vn',
        plan: targetOrder.packageId,
        billingCycle: targetOrder.packageId === 'premium_yearly' ? 'yearly' : 'monthly',
        amount: targetOrder.amount,
        orderId: targetOrder.id,
        returnUrl: `${baseUrl}/checkout/${targetOrder.id}`,
        notifyUrl: process.env.MOMO_NOTIFY_URL || `${baseUrl}/api/payments/momo/notify`,
      });
      payUrl = momoRes.payUrl;
      qrCodeUrl = momoRes.qrCodeUrl;
    } else if (provider === 'zalopay') {
      const zlpRes = await zalopayProvider.createPayment({
        userId,
        userEmail: req.user?.email || 'student@studysync.vn',
        plan: targetOrder.packageId,
        billingCycle: targetOrder.packageId === 'premium_yearly' ? 'yearly' : 'monthly',
        amount: targetOrder.amount,
        orderId: targetOrder.id,
        returnUrl: `${baseUrl}/checkout/${targetOrder.id}`,
        notifyUrl: process.env.ZALOPAY_CALLBACK_URL || `${baseUrl}/api/payments/zalopay/callback`,
      });
      payUrl = zlpRes.payUrl;
      qrCodeUrl = zlpRes.qrCodeUrl;
    }

    updateOrderStatus(targetOrder.id, targetOrder.status, { payUrl, qrCodeUrl });

    return res.json({
      success: true,
      orderId: targetOrder.id,
      orderCode: targetOrder.orderCode,
      amount: targetOrder.amount,
      payUrl,
      qrCodeUrl,
      message: 'Khởi tạo thanh toán thành công.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: 'PAYMENT_CREATION_FAILED',
      message: err.message || 'Lỗi khởi tạo thanh toán.',
    });
  }
});

// Generic payment webhook: POST /api/payments/webhook
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  try {
    const provider = req.headers['x-payment-provider'] || req.body.provider || 'momo';
    console.log(`[Universal Payment Webhook] Received from ${provider}:`, req.body);

    if (provider === 'momo') {
      const verification = momoProvider.verifyCallback(req.body);
      if (!verification.isValid || !verification.orderId) {
        return res.status(400).json({ success: false, message: 'Chữ ký MoMo không hợp lệ' });
      }
      if (verification.resultCode === 0) {
        confirmPaymentAndUpgrade({
          orderId: verification.orderId,
          provider: 'momo',
          providerTransactionId: verification.transId,
          amount: verification.amount,
        });
      }
      return res.status(200).json({ success: true, message: 'Processed' });
    } else if (provider === 'zalopay') {
      const verification = zalopayProvider.verifyCallback(req.body);
      if (!verification.isValid || !verification.orderId) {
        return res.json({ return_code: -1, return_message: 'Invalid MAC' });
      }
      confirmPaymentAndUpgrade({
        orderId: verification.orderId,
        provider: 'zalopay',
        providerTransactionId: verification.appTransId,
        amount: verification.amount,
      });
      return res.json({ return_code: 1, return_message: 'success' });
    }

    return res.status(400).json({ success: false, message: 'Nhà cung cấp thanh toán không được hỗ trợ' });
  } catch (err: any) {
    console.error('[Universal Payment Webhook Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payments/history (Consolidated payment & order history)
app.get('/api/payments/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const transactions = getUserTransactions(req.userId!);
  const orders = getUserOrders(req.userId!);
  const sub = getUserSubscription(req.userId!);

  return res.json({
    success: true,
    subscription: sub,
    transactions,
    orders,
  });
});

// ====================================================================
// Notification Endpoints (Requirement 7 & 8)
// ====================================================================

// GET /api/notifications
app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const filterType = req.query.type as string;
  const notifications = getUserNotifications(req.userId!, filterType);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return res.json({
    success: true,
    notifications,
    unreadCount,
  });
});

// PATCH /api/notifications/:id/read
app.patch('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = markNotificationAsRead(req.userId!, req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
  }
  return res.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc.' });
});

// POST /api/notifications/read-all
app.post('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const count = markAllNotificationsAsRead(req.userId!);
  return res.json({ success: true, count, message: `Đã đánh dấu ${count} thông báo là đã đọc.` });
});

// DELETE /api/notifications/:id
app.delete('/api/notifications/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = deleteNotification(req.userId!, req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo cần xóa.' });
  }
  return res.json({ success: true, message: 'Đã xóa thông báo thành công.' });
});

// GET /api/notification-settings
app.get('/api/notification-settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const settings = getUserNotificationSettings(req.userId!);
  return res.json({ success: true, settings });
});

// PATCH /api/notification-settings
app.patch('/api/notification-settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = updateUserNotificationSettings(req.userId!, req.body);
  return res.json({
    success: true,
    settings: updated,
    message: 'Cài đặt thông báo email đã được cập nhật thành công.',
  });
});

// ====================================================================
// Language Setting Endpoint (Requirement 5)
// ====================================================================

// POST /api/profile/language
app.post('/api/profile/language', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { language } = req.body;
  if (language !== 'vi' && language !== 'en') {
    return res.status(400).json({ success: false, message: 'Ngôn ngữ chỉ chấp nhận vi hoặc en.' });
  }

  const result = updateUserLanguage(req.userId!, language);
  return res.json({
    success: true,
    user: result.user,
    language,
    message: result.message,
  });
});

// Server Initialization
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Periodic background task for deadline and premium expiry notifications (Requirement 8)
  setInterval(async () => {
    try {
      await checkAndSendDeadlineNotifications();
      await checkAndSendPremiumExpiryNotifications();
    } catch (workerErr: any) {
      console.warn('[Periodic Notification Worker Error]', workerErr?.message);
    }
  }, 120000); // Check every 2 minutes

  // Validate email configuration on startup (logs missing env vars clearly, never logs secrets)
  validateEmailConfigOnStartup();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StudyMind AI fullstack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
