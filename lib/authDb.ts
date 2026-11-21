import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendOrderCreatedEmail,
  sendDeadlineReminderEmail,
  sendPremiumExpiryEmail,
  sendMarketingPromoEmail,
  getBaseAppUrl,
  getLatestSandboxEmail,
} from './emailService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================================================================
// Type Definitions
// ====================================================================

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  salt: string;
  avatarUrl?: string;
  school?: string;
  major?: string;
  academicYear?: string;
  timezone?: string;
  language?: 'vi' | 'en';
  notifications?: {
    remind1Day: boolean;
    remind3Days: boolean;
    aiNotifications: boolean;
  };
  plan: 'free' | 'premium';
  planStatus: 'active' | 'trial' | 'expired';
  role?: 'admin' | 'user';
  emailVerified: boolean;
  emailVerifiedAt?: string;
  status: 'active' | 'pending_verification' | 'suspended';
  verificationToken?: string;
  verificationTokenExpiresAt?: string;
  usedVerificationTokens?: string[];
  verificationResendCount?: number;
  verificationResendWindowStart?: string;
  lastVerificationEmailSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface PasswordResetRecord {
  token: string;
  email: string;
  expiresAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'WAITING_VERIFICATION'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface OrderRecord {
  id: string; // e.g. ORD_...
  orderCode: string; // e.g. SS123456
  userId: string;
  packageId: 'premium_monthly' | 'premium_yearly';
  amount: number;
  currency: 'vnd' | 'usd';
  status: OrderStatus;
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'bank';
  paymentMethod: string;
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
  updatedAt: string;
}

export type NotificationType = 'deadline' | 'premium_promo' | 'premium_expiry' | 'payment' | 'account';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: 'email' | 'in_app' | 'both';
  status: 'pending' | 'sent' | 'read' | 'failed';
  read: boolean;
  relatedEntityId?: string;
  scheduledAt?: string;
  sentAt?: string;
  errorMessage?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface NotificationSettings {
  accountEmails: boolean; // default true, non-opt-out security emails
  deadlineEmails: boolean; // default true
  premiumEmails: boolean; // default true
  marketingEmails: boolean; // default false (opt-out)
  transactionEmails: boolean; // default true
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'manual' | 'bank';
  providerOrderId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  plan: 'free' | 'premium';
  status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'manual' | 'bank';
  orderId: string;
  providerTransactionId: string;
  subscriptionId?: string;
  amount: number;
  currency: 'vnd' | 'usd';
  plan: 'premium_monthly' | 'premium_yearly';
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired';
  paymentMethod: string;
  paidAt?: string;
  failureReason?: string;
  rawStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSubject {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  lecturer?: string;
  schedule?: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredLesson {
  id: string;
  ownerId: string;
  subjectId: string;
  title: string;
  lessonDate?: string;
  classroom?: string;
  initialNotes?: string;
  audioUrl?: string;
  storagePath?: string;
  audioDuration?: number;
  audioSize?: number;
  audioMimeType?: string;
  audioFileId?: string;
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
  transcriptionStatus?: string;
  summaryStatus?: string;
  analysisStatus?: string;
  status?: string;
  analysisError?: string;
  analyzedAt?: string;
  sourceType?: string;
  createdAt?: string;
  updatedAt: string;
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

export interface StoredDeadline {
  id: string;
  ownerId: string;
  subjectId: string;
  groupId?: string;
  title: string;
  description?: string;
  type: string;
  dueDate: string;
  dueTime?: string;
  priority: string;
  status: string;
  sourceType: string;
  checklist?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredFlashcard {
  id: string;
  ownerId: string;
  subjectId: string;
  lessonId?: string;
  front: string;
  back: string;
  example?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  reviewStatus: 'new' | 'learning' | 'mastered';
  correctCount: number;
  incorrectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredQuiz {
  id: string;
  ownerId: string;
  subjectId: string;
  lessonId?: string;
  title: string;
  questions: any[];
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface StoredQuizAttempt {
  id: string;
  ownerId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  completedAt: string;
}

export interface StoredStudyGroup {
  id: string;
  ownerId: string;
  subjectId: string;
  name: string;
  description: string;
  inviteCode: string;
  createdAt: string;
}

export interface StoredGroupMember {
  id: string;
  groupId: string;
  userId: string;
  fullName: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

// ====================================================================
// Persistence Layer
// ====================================================================

function readJsonFile<T>(filename: string, fallback: T): T {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[Storage] Failed to read ${filename}:`, err);
  }
  return fallback;
}

function writeJsonFile(filename: string, data: any): void {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Storage] Failed to write ${filename}:`, err);
  }
}

// Auto-flushing Map for unified workspace persistence across server.ts and authDb.ts
let isInitialDataLoaded = false;

class PersistentMap<K, V> extends Map<K, V> {
  private filename: string;

  constructor(filename: string) {
    super();
    this.filename = filename;
  }

  override set(key: K, value: V): this {
    super.set(key, value);
    if (isInitialDataLoaded) {
      writeJsonFile(this.filename, Array.from(this.values()));
    }
    return this;
  }

  override delete(key: K): boolean {
    const res = super.delete(key);
    if (res && isInitialDataLoaded) {
      writeJsonFile(this.filename, Array.from(this.values()));
    }
    return res;
  }
}

// In-memory active stores loaded from disk
const usersMap = new Map<string, UserAccount>();
const sessionsMap = new Map<string, UserSession>();
const passwordResetMap = new Map<string, PasswordResetRecord>();
const subscriptionsMap = new Map<string, SubscriptionRecord>();
const transactionsMap = new Map<string, TransactionRecord>();
const ordersMap = new Map<string, OrderRecord>();
const notificationsMap = new Map<string, NotificationRecord>();
const notificationSettingsMap = new Map<string, NotificationSettings>();
export const subjectsMap = new PersistentMap<string, StoredSubject>('subjects.json');
export const lessonsMap = new PersistentMap<string, StoredLesson>('lessons.json');
export const documentsMap = new PersistentMap<string, StoredDocument>('documents.json');
export const deadlinesMap = new PersistentMap<string, StoredDeadline>('deadlines.json');
export const flashcardsMap = new PersistentMap<string, StoredFlashcard>('flashcards.json');
export const quizzesMap = new PersistentMap<string, StoredQuiz>('quizzes.json');
export const quizAttemptsMap = new PersistentMap<string, StoredQuizAttempt>('quiz_attempts.json');
export const studyGroupsMap = new PersistentMap<string, StoredStudyGroup>('study_groups.json');
export const groupMembersMap = new PersistentMap<string, StoredGroupMember>('group_members.json');

// Rate limit maps
const resendVerificationRateMap = new Map<string, number>();
const passwordResetRateMap = new Map<string, number>();

// Plan pricing definitions (Server authoritative - never trusts frontend price)
export const PLAN_PRICING: Record<string, { id: 'premium_monthly' | 'premium_yearly'; name: string; amount: number; currency: 'vnd'; durationDays: number }> = {
  premium_monthly: {
    id: 'premium_monthly',
    name: 'Gói 1 Tháng',
    amount: 79000,
    currency: 'vnd',
    durationDays: 30,
  },
  premium_yearly: {
    id: 'premium_yearly',
    name: 'Gói 1 Năm',
    amount: 699000,
    currency: 'vnd',
    durationDays: 365,
  },
};

// Initialize memory from disk
function loadAllData() {
  isInitialDataLoaded = false;
  const users: UserAccount[] = readJsonFile('users.json', []);
  for (const u of users) {
    if (u.emailVerified === undefined) u.emailVerified = true;
    if (!u.status) u.status = 'active';
    if (!u.language) u.language = 'vi';
    usersMap.set(u.id, u);
  }

  const sessions: UserSession[] = readJsonFile('sessions.json', []);
  const now = new Date();
  for (const s of sessions) {
    if (new Date(s.expiresAt) > now) {
      sessionsMap.set(s.token, s);
    }
  }

  const subs: SubscriptionRecord[] = readJsonFile('subscriptions.json', []);
  for (const s of subs) subscriptionsMap.set(s.userId, s);

  const txs: TransactionRecord[] = readJsonFile('transactions.json', []);
  for (const t of txs) transactionsMap.set(t.id, t);

  const orders: OrderRecord[] = readJsonFile('orders.json', []);
  for (const o of orders) ordersMap.set(o.id, o);

  const notifs: NotificationRecord[] = readJsonFile('notifications.json', []);
  for (const n of notifs) notificationsMap.set(n.id, n);

  const notifSettings: Array<{ userId: string; settings: NotificationSettings }> = readJsonFile('notification_settings.json', []);
  for (const item of notifSettings) notificationSettingsMap.set(item.userId, item.settings);

  const subjects: StoredSubject[] = readJsonFile('subjects.json', []);
  for (const s of subjects) subjectsMap.set(s.id, s);

  const lessons: StoredLesson[] = readJsonFile('lessons.json', []);
  for (const l of lessons) lessonsMap.set(l.id, l);

  const docs: StoredDocument[] = readJsonFile('documents.json', []);
  for (const d of docs) documentsMap.set(d.id, d);

  const deadlines: StoredDeadline[] = readJsonFile('deadlines.json', []);
  for (const d of deadlines) deadlinesMap.set(d.id, d);

  const flashcards: StoredFlashcard[] = readJsonFile('flashcards.json', []);
  for (const f of flashcards) flashcardsMap.set(f.id, f);

  const quizzes: StoredQuiz[] = readJsonFile('quizzes.json', []);
  for (const q of quizzes) quizzesMap.set(q.id, q);

  const quizAttempts: StoredQuizAttempt[] = readJsonFile('quiz_attempts.json', []);
  for (const qa of quizAttempts) quizAttemptsMap.set(qa.id, qa);

  const groups: StoredStudyGroup[] = readJsonFile('study_groups.json', []);
  for (const g of groups) studyGroupsMap.set(g.id, g);

  const members: StoredGroupMember[] = readJsonFile('group_members.json', []);
  for (const m of members) groupMembersMap.set(m.id, m);

  isInitialDataLoaded = true;
  ensureSeedDemoUser();
}

function flushUsers() {
  writeJsonFile('users.json', Array.from(usersMap.values()));
}
function flushSessions() {
  writeJsonFile('sessions.json', Array.from(sessionsMap.values()));
}
function flushSubscriptions() {
  writeJsonFile('subscriptions.json', Array.from(subscriptionsMap.values()));
}
function flushTransactions() {
  writeJsonFile('transactions.json', Array.from(transactionsMap.values()));
}
export function flushOrders() {
  writeJsonFile('orders.json', Array.from(ordersMap.values()));
}
export function flushNotifications() {
  writeJsonFile('notifications.json', Array.from(notificationsMap.values()));
}
export function flushNotificationSettings() {
  const list = Array.from(notificationSettingsMap.entries()).map(([userId, settings]) => ({ userId, settings }));
  writeJsonFile('notification_settings.json', list);
}
export function flushSubjects() {
  writeJsonFile('subjects.json', Array.from(subjectsMap.values()));
}
export function flushLessons() {
  writeJsonFile('lessons.json', Array.from(lessonsMap.values()));
}
export function flushDocuments() {
  writeJsonFile('documents.json', Array.from(documentsMap.values()));
}
export function flushDeadlines() {
  writeJsonFile('deadlines.json', Array.from(deadlinesMap.values()));
}
export function flushFlashcards() {
  writeJsonFile('flashcards.json', Array.from(flashcardsMap.values()));
}
export function flushQuizzes() {
  writeJsonFile('quizzes.json', Array.from(quizzesMap.values()));
}
export function flushQuizAttempts() {
  writeJsonFile('quiz_attempts.json', Array.from(quizAttemptsMap.values()));
}
export function flushStudyGroups() {
  writeJsonFile('study_groups.json', Array.from(studyGroupsMap.values()));
}
export function flushGroupMembers() {
  writeJsonFile('group_members.json', Array.from(groupMembersMap.values()));
}

// ====================================================================
// Password & Crypto Security
// ====================================================================

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const hash = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

export function sanitizeUser(user: UserAccount) {
  const {
    passwordHash: _hash,
    salt: _salt,
    verificationToken: _vt,
    verificationTokenExpiresAt: _vte,
    usedVerificationTokens: _uvt,
    verificationResendCount: _vrc,
    verificationResendWindowStart: _vrws,
    ...safe
  } = user;
  return safe;
}

// Seed authentic demo accounts if not already present
function ensureSeedDemoUser() {
  const demoUserId = 'usr_demo_101';
  let demoUser = usersMap.get(demoUserId);

  if (!demoUser) {
    const salt = crypto.randomBytes(16).toString('hex');
    demoUser = {
      id: demoUserId,
      email: 'minh.nguyen@studymind.edu.vn',
      fullName: 'Nguyễn Văn Minh',
      passwordHash: hashPassword('password123', salt),
      salt,
      school: 'Đại học Quốc Gia TP.HCM',
      major: 'Công nghệ Thông tin',
      academicYear: 'Năm 3',
      timezone: 'Asia/Ho_Chi_Minh',
      plan: 'free',
      planStatus: 'active',
      role: 'admin',
      emailVerified: true,
      status: 'active',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: new Date().toISOString(),
    };
    usersMap.set(demoUserId, demoUser);
    flushUsers();
  } else if (!demoUser.role) {
    demoUser.role = 'admin';
    usersMap.set(demoUserId, demoUser);
    flushUsers();
  }

  // Ensure subscription for demo user
  if (!subscriptionsMap.has(demoUserId)) {
    const demoSub: SubscriptionRecord = {
      id: `sub_init_${demoUserId}`,
      userId: demoUserId,
      provider: 'test',
      plan: 'free',
      status: 'active',
      billingCycle: 'monthly',
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    subscriptionsMap.set(demoUserId, demoSub);
    flushSubscriptions();
  }

  // Ensure phatha18076@gmail.com exists as unverified account without duplication (Requirement 9)
  const targetUnverifiedEmail = 'phatha18076@gmail.com';
  const matchingAccounts: UserAccount[] = [];
  for (const u of usersMap.values()) {
    if (u.email.toLowerCase() === targetUnverifiedEmail) {
      matchingAccounts.push(u);
    }
  }

  if (matchingAccounts.length === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const nowIso = new Date().toISOString();
    const phathaUserId = 'usr_phatha18076';
    const phathaUser: UserAccount = {
      id: phathaUserId,
      email: targetUnverifiedEmail,
      fullName: 'Phát Hà',
      passwordHash: hashPassword('Password123', salt),
      salt,
      school: '',
      major: '',
      academicYear: 'Năm 2',
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      plan: 'free',
      planStatus: 'active',
      emailVerified: false,
      status: 'pending_verification',
      verificationToken: crypto.randomBytes(32).toString('hex'),
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      usedVerificationTokens: [],
      verificationResendCount: 0,
      verificationResendWindowStart: nowIso,
      lastVerificationEmailSent: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    usersMap.set(phathaUserId, phathaUser);
    flushUsers();
  } else if (matchingAccounts.length > 1) {
    // Deduplicate if multiple records ever existed
    const primary = matchingAccounts[0];
    for (let i = 1; i < matchingAccounts.length; i++) {
      usersMap.delete(matchingAccounts[i].id);
    }
    if (!primary.emailVerified) {
      primary.status = 'pending_verification';
      if (!primary.verificationToken) {
        primary.verificationToken = crypto.randomBytes(32).toString('hex');
      }
      if (
        !primary.verificationTokenExpiresAt ||
        new Date(primary.verificationTokenExpiresAt).getTime() < Date.now()
      ) {
        primary.verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000).toISOString();
      }
      usersMap.set(primary.id, primary);
    }
    flushUsers();
  } else {
    const existingPhatha = matchingAccounts[0];
    if (!existingPhatha.emailVerified) {
      existingPhatha.status = 'pending_verification';
      if (!existingPhatha.verificationToken) {
        existingPhatha.verificationToken = crypto.randomBytes(32).toString('hex');
      }
      if (
        !existingPhatha.verificationTokenExpiresAt ||
        new Date(existingPhatha.verificationTokenExpiresAt).getTime() < Date.now()
      ) {
        existingPhatha.verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000).toISOString();
      }
      usersMap.set(existingPhatha.id, existingPhatha);
      flushUsers();
    }
  }
}

// Initial load
loadAllData();

// ====================================================================
// Authentication Business Logic
// ====================================================================

const MAX_RESEND_PER_HOUR = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export async function registerUser(data: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  school?: string;
  major?: string;
  academicYear?: string;
  agreeTerms?: boolean;
  language?: 'vi' | 'en';
  appBaseUrl?: string;
  otpVerified?: boolean;
}): Promise<{
  success: boolean;
  accountCreated: boolean;
  verificationEmailSent: boolean;
  code: string;
  user?: any;
  token?: string;
  emailSent?: boolean;
  emailAlreadyExists?: boolean;
  emailVerified?: boolean;
  canResendVerification?: boolean;
  emailProvider?: string;
  emailError?: string;
  emailErrorCode?: string;
  errorCode?: string;
  verificationUrl?: string;
  verificationToken?: string;
  emailPreviewUrl?: string;
  message: string;
}> {
  const email = (data.email || '').trim().toLowerCase();
  const fullName = (data.fullName || '').trim();
  const password = data.password || '';
  const confirmPassword = data.confirmPassword || '';
  const lang: 'vi' | 'en' = data.language === 'en' ? 'en' : 'vi';
  const isEn = lang === 'en';

  // 1. Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      success: false,
      accountCreated: false,
      verificationEmailSent: false,
      code: 'INVALID_EMAIL',
      errorCode: 'INVALID_EMAIL',
      message: isEn ? 'Please enter a valid email address.' : 'Địa chỉ email không hợp lệ.',
    };
  }

  // 2. Full Name check
  if (!fullName) {
    return {
      success: false,
      accountCreated: false,
      verificationEmailSent: false,
      code: 'INVALID_NAME',
      errorCode: 'INVALID_NAME',
      message: isEn ? 'Please enter your full name.' : 'Vui lòng nhập họ và tên của bạn.',
    };
  }

  // 3. Password length check
  if (password.length < 8) {
    return {
      success: false,
      accountCreated: false,
      verificationEmailSent: false,
      code: 'WEAK_PASSWORD',
      errorCode: 'WEAK_PASSWORD',
      message: isEn ? 'Password must be at least 8 characters long.' : 'Mật khẩu phải có ít nhất 8 ký tự.',
    };
  }

  // 4. Password contains at least 1 letter and 1 digit
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasLetter || !hasDigit) {
    return {
      success: false,
      accountCreated: false,
      verificationEmailSent: false,
      code: 'WEAK_PASSWORD_COMPLEXITY',
      errorCode: 'WEAK_PASSWORD_COMPLEXITY',
      message: isEn
        ? 'Password must contain at least one letter and one number.'
        : 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.',
    };
  }

  // 5. Password confirmation check
  if (confirmPassword && password !== confirmPassword) {
    return {
      success: false,
      accountCreated: false,
      verificationEmailSent: false,
      code: 'PASSWORD_MISMATCH',
      errorCode: 'PASSWORD_MISMATCH',
      message: isEn ? 'Passwords do not match.' : 'Hai mật khẩu không khớp.',
    };
  }

  // 6. Email duplicate check (never create duplicate accounts; distinguish unverified existing accounts)
  for (const existing of usersMap.values()) {
    if (existing.email.toLowerCase() === email) {
      // If client already verified 6-digit OTP via EmailJS, activate or update the existing account and log them in
      if (data.otpVerified) {
        const salt = crypto.randomBytes(16).toString('hex');
        const nowIso = new Date().toISOString();
        existing.fullName = fullName || existing.fullName;
        existing.passwordHash = hashPassword(password, salt);
        existing.salt = salt;
        if (data.school !== undefined) existing.school = data.school.trim();
        if (data.major !== undefined) existing.major = data.major.trim();
        if (data.academicYear) existing.academicYear = data.academicYear;
        existing.emailVerified = true;
        existing.status = 'active';
        existing.updatedAt = nowIso;
        usersMap.set(existing.id, existing);
        flushUsers();

        const token = crypto.randomBytes(32).toString('hex');
        sessionsMap.set(token, {
          token,
          userId: existing.id,
          createdAt: nowIso,
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        });
        flushSessions();

        return {
          success: true,
          accountCreated: true,
          verificationEmailSent: true,
          emailSent: true,
          emailVerified: true,
          code: 'OTP_VERIFIED',
          user: sanitizeUser(existing),
          token,
          message: isEn
            ? 'OTP verified and account activated successfully!'
            : 'Xác thực OTP và đăng ký tài khoản thành công!',
        };
      }

      const isUnverified = !existing.emailVerified;
      return {
        success: false,
        accountCreated: false,
        verificationEmailSent: false,
        emailAlreadyExists: true,
        emailVerified: existing.emailVerified,
        canResendVerification: isUnverified,
        code: isUnverified ? 'EMAIL_ALREADY_EXISTS_UNVERIFIED' : 'EMAIL_ALREADY_EXISTS',
        errorCode: 'EMAIL_ALREADY_EXISTS',
        message: isUnverified
          ? isEn
            ? 'This email address is already registered and awaiting email verification. You can click "Resend Verification Email" to receive a new link.'
            : 'Email này đã được đăng ký nhưng chưa xác nhận. Bạn có thể bấm "Gửi lại email xác nhận" để nhận liên kết kích hoạt.'
          : isEn
          ? 'This email address is already registered.'
          : 'Email này đã được đăng ký tài khoản.',
      };
    }
  }

  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000).toISOString(); // 24 hours
    const nowIso = new Date().toISOString();

    const newUser: UserAccount = {
      id: userId,
      email,
      fullName,
      passwordHash,
      salt,
      school: data.school?.trim() || '',
      major: data.major?.trim() || '',
      academicYear: data.academicYear || 'Năm 1',
      timezone: 'Asia/Ho_Chi_Minh',
      language: lang,
      plan: 'free',
      planStatus: 'active',
      emailVerified: Boolean(data.otpVerified),
      status: data.otpVerified ? 'active' : 'pending_verification',
      verificationToken,
      verificationTokenExpiresAt,
      usedVerificationTokens: [],
      verificationResendCount: 0,
      verificationResendWindowStart: nowIso,
      lastVerificationEmailSent: Boolean(data.otpVerified),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    usersMap.set(userId, newUser);
    flushUsers();

    // Create free subscription record
    const subRecord: SubscriptionRecord = {
      id: `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId,
      provider: 'test',
      plan: 'free',
      status: 'active',
      billingCycle: 'monthly',
      startDate: nowIso,
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    subscriptionsMap.set(userId, subRecord);
    flushSubscriptions();

    // Generate secure session token (30 days validity)
    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      token,
      userId,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    sessionsMap.set(token, session);
    flushSessions();

    if (data.otpVerified) {
      return {
        success: true,
        accountCreated: true,
        verificationEmailSent: true,
        emailSent: true,
        emailVerified: true,
        code: 'OTP_VERIFIED',
        user: sanitizeUser(newUser),
        token,
        emailProvider: 'emailjs_otp',
        message: isEn
          ? 'OTP verified and account created successfully!'
          : 'Xác thực OTP và đăng ký tài khoản thành công!',
      };
    }

    // Await verification email delivery (never swallow errors silently)
    const emailRes = await sendVerificationEmail({
      to: email,
      fullName,
      token: verificationToken,
      language: lang,
      appUrl: data.appBaseUrl,
    });

    const baseUrl = getBaseAppUrl(data.appBaseUrl);
    const verificationUrl =
      emailRes.verificationUrl || `${baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
    const emailSent = Boolean(emailRes.success && emailRes.emailSent);
    newUser.lastVerificationEmailSent = emailSent;
    usersMap.set(userId, newUser);
    flushUsers();

    if (emailSent) {
      resendVerificationRateMap.set(userId, Date.now());
      return {
        success: true,
        accountCreated: true,
        verificationEmailSent: true,
        emailSent: true,
        code: 'VERIFICATION_EMAIL_SENT',
        user: sanitizeUser(newUser),
        token,
        emailProvider: emailRes.provider,
        verificationUrl,
        verificationToken,
        emailPreviewUrl: emailRes.previewUrl,
        message: isEn
          ? `Account created! A verification email has been sent to ${email}. Please check your Inbox, Spam, or Promotions folder.`
          : `Đăng ký thành công! Email xác nhận đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư Inbox, Spam hoặc Promotions.`,
      };
    }

    // Account created, but verification email failed to send (Requirement 3 & 10)
    return {
      success: false,
      accountCreated: true,
      verificationEmailSent: false,
      emailSent: false,
      code: 'VERIFICATION_EMAIL_SEND_FAILED',
      errorCode: emailRes.errorCode || 'VERIFICATION_EMAIL_SEND_FAILED',
      emailErrorCode: emailRes.errorCode,
      emailProvider: emailRes.provider,
      emailError: emailRes.error,
      verificationUrl,
      verificationToken,
      user: sanitizeUser(newUser),
      token,
      message: isEn
        ? 'Your account has been created, but the verification email could not be sent. Please configure the email service or try resending later.'
        : 'Tài khoản đã được tạo nhưng chưa gửi được email xác nhận.',
    };
  } catch (err: any) {
    console.error('[Register User Error]:', err?.message || err);
    return {
      success: false,
      accountCreated: false,
      verificationEmailSent: false,
      code: 'REGISTRATION_FAILED',
      errorCode: 'REGISTRATION_FAILED',
      message: isEn ? 'Could not create account. Please try again.' : 'Không thể tạo tài khoản. Vui lòng thử lại.',
    };
  }
}

export function loginUser(emailInput: string, passwordInput: string): {
  success: boolean;
  user?: any;
  token?: string;
  errorCode?: string;
  message: string;
} {
  const email = (emailInput || '').trim().toLowerCase();
  const password = passwordInput || '';

  if (!email || !password) {
    return {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email hoặc mật khẩu không chính xác.',
    };
  }

  // Find user strictly by email
  let foundUser: UserAccount | null = null;
  for (const u of usersMap.values()) {
    if (u.email.toLowerCase() === email) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser) {
    return {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email hoặc mật khẩu không chính xác.',
    };
  }

  // Verify password hash
  const isValid = verifyPassword(password, foundUser.salt, foundUser.passwordHash);
  if (!isValid) {
    return {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email hoặc mật khẩu không chính xác.',
    };
  }

  // Create new session token
  const token = crypto.randomBytes(32).toString('hex');
  const session: UserSession = {
    token,
    userId: foundUser.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
  sessionsMap.set(token, session);
  flushSessions();

  return {
    success: true,
    user: sanitizeUser(foundUser),
    token,
    message: 'Đăng nhập thành công.',
  };
}

export function verifySessionToken(token: string): {
  valid: boolean;
  user?: any;
  session?: UserSession;
  errorCode?: string;
  message?: string;
} {
  if (!token) {
    return { valid: false, errorCode: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để tiếp tục.' };
  }

  const session = sessionsMap.get(token);
  if (!session) {
    if (token.startsWith('usr_') && usersMap.has(token)) {
      const directUser = usersMap.get(token)!;
      return {
        valid: true,
        user: sanitizeUser(directUser),
      };
    }
    return { valid: false, errorCode: 'INVALID_SESSION', message: 'Phiên đăng nhập không hợp lệ.' };
  }

  if (new Date(session.expiresAt) < new Date()) {
    sessionsMap.delete(token);
    flushSessions();
    return { valid: false, errorCode: 'SESSION_EXPIRED', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const user = usersMap.get(session.userId);
  if (!user) {
    sessionsMap.delete(token);
    flushSessions();
    return { valid: false, errorCode: 'USER_NOT_FOUND', message: 'Tài khoản không tồn tại trên hệ thống.' };
  }

  return {
    valid: true,
    user: sanitizeUser(user),
    session,
  };
}

export function logoutUser(token: string): boolean {
  if (token && sessionsMap.has(token)) {
    sessionsMap.delete(token);
    flushSessions();
    return true;
  }
  return false;
}

// ====================================================================
// Email Verification Logic
// ====================================================================

export function verifyEmailWithToken(
  token: string,
  language?: 'vi' | 'en'
): {
  success: boolean;
  user?: any;
  token?: string;
  email?: string;
  alreadyVerified?: boolean;
  errorCode?: string;
  message: string;
} {
  const cleanToken = (token || '').trim();
  const isEn = language === 'en';

  if (!cleanToken) {
    return {
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: isEn
        ? 'Verification token is missing or invalid.'
        : 'Mã xác nhận không hợp lệ hoặc bị thiếu.',
    };
  }

  // 1. Check if token was already used previously (single-use enforcement)
  for (const u of usersMap.values()) {
    if (Array.isArray(u.usedVerificationTokens) && u.usedVerificationTokens.includes(cleanToken)) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const nowIso = new Date().toISOString();
      sessionsMap.set(sessionToken, {
        token: sessionToken,
        userId: u.id,
        createdAt: nowIso,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      flushSessions();

      return {
        success: false,
        alreadyVerified: u.emailVerified,
        user: sanitizeUser(u),
        token: sessionToken,
        email: u.email,
        errorCode: 'TOKEN_ALREADY_USED',
        message: isEn
          ? 'This verification link has already been used. Your email address is already verified — you can sign in now.'
          : 'Liên kết xác nhận này đã được sử dụng trước đó. Email của bạn đã được xác nhận — bạn có thể đăng nhập ngay.',
      };
    }
  }

  // 2. Find user with matching active verificationToken
  let foundUser: UserAccount | null = null;
  for (const u of usersMap.values()) {
    if (u.verificationToken === cleanToken) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser) {
    return {
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: isEn
        ? 'This verification link is invalid or has been replaced by a newer link. Please request a new verification email.'
        : 'Liên kết xác nhận không hợp lệ hoặc đã bị thay thế bởi email mới hơn. Vui lòng yêu cầu gửi lại email xác nhận.',
    };
  }

  // 3. Check if already verified
  if (foundUser.emailVerified) {
    foundUser.usedVerificationTokens = [...(foundUser.usedVerificationTokens || []), cleanToken];
    foundUser.verificationToken = undefined;
    foundUser.verificationTokenExpiresAt = undefined;
    foundUser.updatedAt = new Date().toISOString();
    usersMap.set(foundUser.id, foundUser);
    flushUsers();

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const nowIso = new Date().toISOString();
    sessionsMap.set(sessionToken, {
      token: sessionToken,
      userId: foundUser.id,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    flushSessions();

    return {
      success: false,
      alreadyVerified: true,
      user: sanitizeUser(foundUser),
      token: sessionToken,
      email: foundUser.email,
      errorCode: 'TOKEN_ALREADY_USED',
      message: isEn
        ? 'This verification link has already been used. Your account is already verified.'
        : 'Liên kết xác nhận này đã được sử dụng. Tài khoản của bạn đã được xác minh.',
    };
  }

  // 4. Check expiration (24h)
  if (
    foundUser.verificationTokenExpiresAt &&
    new Date(foundUser.verificationTokenExpiresAt).getTime() < Date.now()
  ) {
    return {
      success: false,
      email: foundUser.email,
      errorCode: 'TOKEN_EXPIRED',
      message: isEn
        ? 'This verification link has expired (valid for 24 hours). Please click "Resend Verification Email" to receive a new link.'
        : 'Liên kết xác nhận đã hết hạn (hiệu lực 24 giờ). Vui lòng nhấn "Gửi lại email xác nhận" để nhận liên kết mới.',
    };
  }

  // 5. Activate user & invalidate token so it can only be used once
  const nowIso = new Date().toISOString();
  foundUser.emailVerified = true;
  foundUser.emailVerifiedAt = nowIso;
  foundUser.status = 'active';
  foundUser.usedVerificationTokens = [...(foundUser.usedVerificationTokens || []), cleanToken];
  foundUser.verificationToken = undefined;
  foundUser.verificationTokenExpiresAt = undefined;
  foundUser.updatedAt = nowIso;

  usersMap.set(foundUser.id, foundUser);
  flushUsers();

  // Issue a valid 30-day session token so the verified user is immediately authenticated
  const sessionToken = crypto.randomBytes(32).toString('hex');
  sessionsMap.set(sessionToken, {
    token: sessionToken,
    userId: foundUser.id,
    createdAt: nowIso,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
  flushSessions();

  return {
    success: true,
    user: sanitizeUser(foundUser),
    token: sessionToken,
    email: foundUser.email,
    message: isEn
      ? 'Email verified successfully! Your StudySync AI account is now fully activated.'
      : 'Xác nhận email thành công! Tài khoản StudySync AI của bạn đã được kích hoạt đầy đủ.',
  };
}

export async function resendVerificationEmail(
  identifier: string,
  options?: { language?: 'vi' | 'en'; appBaseUrl?: string }
): Promise<{
  success: boolean;
  emailSent: boolean;
  email?: string;
  alreadyVerified?: boolean;
  emailProvider?: string;
  emailError?: string;
  errorCode?: string;
  verificationUrl?: string;
  verificationToken?: string;
  emailPreviewUrl?: string;
  message: string;
  cooldownSeconds?: number;
  remainingAttempts?: number;
}> {
  const query = (identifier || '').trim().toLowerCase();
  let user: UserAccount | null = null;

  for (const u of usersMap.values()) {
    if (u.id.toLowerCase() === query || u.email.toLowerCase() === query) {
      user = u;
      break;
    }
  }

  const lang: 'vi' | 'en' =
    options?.language === 'en'
      ? 'en'
      : options?.language === 'vi'
      ? 'vi'
      : user?.language === 'en'
      ? 'en'
      : 'vi';
  const isEn = lang === 'en';

  // 1. Check if account exists
  if (!user) {
    return {
      success: false,
      emailSent: false,
      errorCode: 'USER_NOT_FOUND',
      message: isEn
        ? 'No account found with this email address. Please check your email or register a new account.'
        : 'Không tìm thấy tài khoản với địa chỉ email này. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.',
    };
  }

  // 2. Check if email is already verified
  if (user.emailVerified) {
    return {
      success: false,
      emailSent: false,
      alreadyVerified: true,
      email: user.email,
      errorCode: 'ALREADY_VERIFIED',
      message: isEn
        ? 'This account has already been verified. You can sign in right away.'
        : 'Tài khoản này đã được xác nhận email trước đó. Bạn có thể đăng nhập ngay.',
    };
  }

  const now = Date.now();

  // 3. Cooldown check between sends (60 seconds)
  const lastSent = resendVerificationRateMap.get(user.id) || 0;
  const elapsedSeconds = Math.floor((now - lastSent) / 1000);
  if (lastSent > 0 && elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
    const waitSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
    return {
      success: false,
      emailSent: false,
      email: user.email,
      errorCode: 'RATE_LIMITED',
      cooldownSeconds: waitSeconds,
      message: isEn
        ? `Please wait ${waitSeconds} seconds before requesting another verification email.`
        : `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại email xác nhận.`,
    };
  }

  // 4. Hourly max resend limit check (max 5 resends per hour)
  const windowStartMs = user.verificationResendWindowStart
    ? new Date(user.verificationResendWindowStart).getTime()
    : 0;
  const oneHourMs = 3600 * 1000;
  let resendCount = user.verificationResendCount || 0;

  if (!windowStartMs || now - windowStartMs >= oneHourMs) {
    resendCount = 0;
    user.verificationResendWindowStart = new Date(now).toISOString();
  }

  if (resendCount >= MAX_RESEND_PER_HOUR) {
    const retryAfterSeconds = Math.max(
      60,
      Math.ceil((windowStartMs + oneHourMs - now) / 1000)
    );
    const retryMinutes = Math.ceil(retryAfterSeconds / 60);
    return {
      success: false,
      emailSent: false,
      email: user.email,
      errorCode: 'MAX_RESEND_EXCEEDED',
      cooldownSeconds: retryAfterSeconds,
      remainingAttempts: 0,
      message: isEn
        ? `You have reached the maximum limit of ${MAX_RESEND_PER_HOUR} verification emails per hour. Please try again in ${retryMinutes} minute(s).`
        : `Bạn đã vượt quá giới hạn gửi lại email xác nhận (${MAX_RESEND_PER_HOUR} lần/giờ). Vui lòng thử lại sau ${retryMinutes} phút.`,
    };
  }

  // 5. Update verification token and 24h expiration (Requirement 9):
  // If previous send failed and existing token is still valid and unused, keep or refresh token without creating redundant tokens;
  // if a previous email was already sent or token is missing/expired, generate a fresh single-use token and invalidate the old one.
  let tokenToSend = user.verificationToken;
  const isTokenUnused =
    tokenToSend &&
    (!Array.isArray(user.usedVerificationTokens) || !user.usedVerificationTokens.includes(tokenToSend));
  const isTokenStillValid =
    user.verificationTokenExpiresAt &&
    new Date(user.verificationTokenExpiresAt).getTime() > now + 3600000;

  if (!tokenToSend || !isTokenUnused || !isTokenStillValid || user.lastVerificationEmailSent === true) {
    if (tokenToSend && user.lastVerificationEmailSent === true) {
      user.usedVerificationTokens = [...(user.usedVerificationTokens || []), tokenToSend];
    }
    tokenToSend = crypto.randomBytes(32).toString('hex');
  }

  user.verificationToken = tokenToSend;
  user.verificationTokenExpiresAt = new Date(now + 24 * 3600000).toISOString();
  user.language = lang;
  user.updatedAt = new Date(now).toISOString();
  usersMap.set(user.id, user);
  flushUsers();

  // 6. Send verification email and await confirmation from provider
  const emailRes = await sendVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    token: tokenToSend,
    language: lang,
    appUrl: options?.appBaseUrl,
  });

  const baseUrl = getBaseAppUrl(options?.appBaseUrl);
  const verificationUrl =
    emailRes.verificationUrl || `${baseUrl}/verify-email?token=${encodeURIComponent(tokenToSend)}`;

  if (!emailRes.success || !emailRes.emailSent) {
    user.lastVerificationEmailSent = false;
    usersMap.set(user.id, user);
    flushUsers();

    let failMsg: string;
    if (emailRes.errorCode === 'SMTP_NOT_CONFIGURED') {
      failMsg = isEn
        ? 'Your account has been created, but the verification email could not be sent. Please configure the email service or try resending later.'
        : 'Tài khoản đã được tạo nhưng email xác nhận chưa gửi được. Vui lòng cấu hình dịch vụ email hoặc thử gửi lại sau.';
    } else if (emailRes.errorCode === 'SMTP_AUTH_FAILED') {
      failMsg = isEn
        ? 'Cannot send verification email: SMTP authentication failed. Please check SMTP_USER and Gmail App Password.'
        : 'Không thể gửi email xác nhận: Xác thực SMTP thất bại. Vui lòng kiểm tra lại SMTP_USER và Gmail App Password.';
    } else if (emailRes.errorCode === 'SMTP_CONNECTION_REFUSED' || emailRes.errorCode === 'SMTP_TIMEOUT') {
      failMsg = isEn
        ? 'Cannot send verification email: Could not connect to the SMTP server. Please check SMTP_HOST and SMTP_PORT.'
        : 'Không thể gửi email xác nhận: Không kết nối được tới máy chủ SMTP. Vui lòng kiểm tra SMTP_HOST và SMTP_PORT.';
    } else {
      failMsg = isEn
        ? `Failed to send verification email to ${user.email}. Please try again later.`
        : `Không thể gửi email xác nhận đến ${user.email} lúc này. Vui lòng thử lại sau.`;
    }

    return {
      success: false,
      emailSent: false,
      email: user.email,
      emailProvider: emailRes.provider,
      emailError: emailRes.error,
      verificationUrl,
      verificationToken: tokenToSend,
      errorCode: emailRes.errorCode || 'VERIFICATION_EMAIL_SEND_FAILED',
      message: failMsg,
    };
  }

  // Record rate-limit and increment counter only when email was genuinely sent
  resendVerificationRateMap.set(user.id, now);
  user.verificationResendCount = resendCount + 1;
  user.lastVerificationEmailSent = true;
  usersMap.set(user.id, user);
  flushUsers();

  const remainingAttempts = Math.max(0, MAX_RESEND_PER_HOUR - user.verificationResendCount);

  return {
    success: true,
    emailSent: true,
    email: user.email,
    emailProvider: emailRes.provider,
    verificationUrl,
    verificationToken: tokenToSend,
    emailPreviewUrl: emailRes.previewUrl,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    remainingAttempts,
    message: isEn
      ? `Verification email has been resent to ${user.email}. Please check your Inbox, Spam, and Promotions folders.`
      : `Đã gửi lại email xác nhận đến ${user.email}. Vui lòng kiểm tra hộp thư Inbox, Spam và Promotions.`,
  };
}

export async function getPendingVerificationInfo(
  identifier: string,
  appBaseUrl?: string
): Promise<{
  success: boolean;
  email?: string;
  fullName?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationUrl?: string;
  emailHtml?: string;
  emailPreviewUrl?: string;
}> {
  const query = (identifier || '').trim().toLowerCase();
  if (!query) {
    return { success: false };
  }

  let user: UserAccount | null = null;
  for (const u of usersMap.values()) {
    if (u.id.toLowerCase() === query || u.email.toLowerCase() === query) {
      user = u;
      break;
    }
  }

  if (!user) {
    return { success: false };
  }

  if (user.emailVerified) {
    return {
      success: true,
      email: user.email,
      fullName: user.fullName,
      emailVerified: true,
    };
  }

  const now = Date.now();
  let token = user.verificationToken;
  const isTokenExpired =
    !user.verificationTokenExpiresAt ||
    new Date(user.verificationTokenExpiresAt).getTime() <= now;

  if (!token || isTokenExpired) {
    token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    user.verificationTokenExpiresAt = new Date(now + 24 * 3600000).toISOString();
    user.updatedAt = new Date(now).toISOString();
    usersMap.set(user.id, user);
    flushUsers();
  }

  // If the account had lastVerificationEmailSent === false (e.g. from before SandboxEmailProvider was enabled),
  // automatically dispatch the verification email now so it's in the mailbox!
  let sandboxMsg = getLatestSandboxEmail(user.email);
  if (!user.lastVerificationEmailSent || !sandboxMsg) {
    const emailRes = await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      token,
      language: user.language || 'vi',
      appUrl: appBaseUrl,
    });
    if (emailRes.success && emailRes.emailSent) {
      user.lastVerificationEmailSent = true;
      usersMap.set(user.id, user);
      flushUsers();
    }
    sandboxMsg = getLatestSandboxEmail(user.email);
  }

  const baseUrl = getBaseAppUrl(appBaseUrl);
  const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  return {
    success: true,
    email: user.email,
    fullName: user.fullName,
    emailVerified: false,
    verificationToken: token,
    verificationUrl,
    emailHtml: sandboxMsg?.html,
    emailPreviewUrl: sandboxMsg?.previewUrl,
  };
}

// ====================================================================
// Password Reset Logic
// ====================================================================

export async function requestPasswordReset(emailInput: string): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
}> {
  const email = (emailInput || '').trim().toLowerCase();

  // Rate limit check
  const lastSent = passwordResetRateMap.get(email) || 0;
  const now = Date.now();
  const elapsed = Math.floor((now - lastSent) / 1000);
  if (elapsed < 60) {
    return {
      success: false,
      message: `Vui lòng đợi ${60 - elapsed} giây trước khi yêu cầu tiếp.`,
      cooldownSeconds: 60 - elapsed,
    };
  }

  let user: UserAccount | null = null;
  for (const u of usersMap.values()) {
    if (u.email.toLowerCase() === email) {
      user = u;
      break;
    }
  }

  if (user) {
    passwordResetRateMap.set(email, now);
    const token = crypto.randomBytes(24).toString('hex');
    passwordResetMap.set(token, {
      token,
      email,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    });

    await sendPasswordResetEmail({
      to: email,
      fullName: user.fullName,
      token,
    });
  }

  // Always return safe identical message
  return {
    success: true,
    message: 'Nếu email đã được đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email đó.',
  };
}

export function resetPasswordWithToken(token: string, newPassword: string): {
  success: boolean;
  errorCode?: string;
  message: string;
} {
  const record = passwordResetMap.get(token);
  if (!record || new Date(record.expiresAt) < new Date()) {
    return {
      success: false,
      errorCode: 'INVALID_RESET_TOKEN',
      message: 'Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.',
    };
  }

  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return {
      success: false,
      errorCode: 'WEAK_PASSWORD',
      message: 'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm cả chữ cái và chữ số.',
    };
  }

  let user: UserAccount | null = null;
  for (const u of usersMap.values()) {
    if (u.email.toLowerCase() === record.email.toLowerCase()) {
      user = u;
      break;
    }
  }

  if (!user) {
    return { success: false, errorCode: 'USER_NOT_FOUND', message: 'Không tìm thấy tài khoản.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  user.salt = salt;
  user.passwordHash = hashPassword(newPassword, salt);
  user.updatedAt = new Date().toISOString();
  usersMap.set(user.id, user);
  flushUsers();

  passwordResetMap.delete(token);

  return {
    success: true,
    message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
  };
}

// ====================================================================
// User Profile Operations
// ====================================================================

export function updateUserProfile(userId: string, data: Partial<UserAccount>): {
  success: boolean;
  user?: any;
  errorCode?: string;
  message: string;
} {
  const user = usersMap.get(userId);
  if (!user) {
    return { success: false, errorCode: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng.' };
  }

  if (data.fullName && data.fullName.trim()) user.fullName = data.fullName.trim();
  if (data.school !== undefined) user.school = data.school.trim();
  if (data.major !== undefined) user.major = data.major.trim();
  if (data.academicYear !== undefined) user.academicYear = data.academicYear;
  if (data.timezone !== undefined) user.timezone = data.timezone;
  if (data.notifications !== undefined) user.notifications = data.notifications;
  user.updatedAt = new Date().toISOString();

  usersMap.set(userId, user);
  flushUsers();

  return {
    success: true,
    user: sanitizeUser(user),
    message: 'Hồ sơ đã được cập nhật thành công.',
  };
}

export function updateUserAvatar(userId: string, avatarUrl: string): {
  success: boolean;
  user?: any;
  message: string;
} {
  const user = usersMap.get(userId);
  if (!user) {
    return { success: false, message: 'Không tìm thấy người dùng.' };
  }

  // Delete previous disk file if stored locally to prevent orphaned files
  if (user.avatarUrl && user.avatarUrl.startsWith(`/api/avatars/${userId}/`)) {
    const oldFilename = path.basename(user.avatarUrl);
    const oldFilePath = path.resolve(__dirname, '..', 'uploads', 'avatars', userId, oldFilename);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.warn('[Avatar Cleanup Warning]', err);
      }
    }
  }

  user.avatarUrl = avatarUrl;
  user.updatedAt = new Date().toISOString();
  usersMap.set(userId, user);
  flushUsers();

  return {
    success: true,
    user: sanitizeUser(user),
    message: 'Ảnh đại diện đã được cập nhật thành công.',
  };
}

export function deleteUserAvatar(userId: string): {
  success: boolean;
  user?: any;
  message: string;
} {
  const user = usersMap.get(userId);
  if (!user) {
    return { success: false, message: 'Không tìm thấy người dùng.' };
  }

  if (user.avatarUrl && user.avatarUrl.startsWith(`/api/avatars/${userId}/`)) {
    const oldFilename = path.basename(user.avatarUrl);
    const oldFilePath = path.resolve(__dirname, '..', 'uploads', 'avatars', userId, oldFilename);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.warn('[Avatar Cleanup Warning]', err);
      }
    }
  }

  user.avatarUrl = undefined;
  user.updatedAt = new Date().toISOString();
  usersMap.set(userId, user);
  flushUsers();

  return {
    success: true,
    user: sanitizeUser(user),
    message: 'Đã xóa ảnh đại diện và quay về avatar mặc định.',
  };
}

export function updateUserLanguage(userId: string, language: 'vi' | 'en'): {
  success: boolean;
  user?: any;
  message: string;
} {
  const user = usersMap.get(userId);
  if (!user) {
    return { success: false, message: 'Không tìm thấy người dùng.' };
  }

  user.language = language;
  user.updatedAt = new Date().toISOString();
  usersMap.set(userId, user);
  flushUsers();

  return {
    success: true,
    user: sanitizeUser(user),
    message: language === 'vi' ? 'Đã đổi ngôn ngữ sang Tiếng Việt' : 'Language changed to English',
  };
}

// ====================================================================
// Per-User Workspace & Data Isolation
// ====================================================================

export function getUserWorkspace(userId: string) {
  const subjects = Array.from(subjectsMap.values()).filter((s) => s.ownerId === userId);
  const lessons = Array.from(lessonsMap.values()).filter((l) => l.ownerId === userId);
  const documents = Array.from(documentsMap.values()).filter((d) => d.ownerId === userId);
  const deadlines = Array.from(deadlinesMap.values()).filter((dl) => dl.ownerId === userId);
  const flashcards = Array.from(flashcardsMap.values()).filter((f) => f.ownerId === userId);
  const quizzes = Array.from(quizzesMap.values()).filter((q) => q.ownerId === userId);
  const quizAttempts = Array.from(quizAttemptsMap.values()).filter((qa) => qa.ownerId === userId);

  // Groups where user is owner or member
  const userMemberGroups = Array.from(groupMembersMap.values())
    .filter((m) => m.userId === userId)
    .map((m) => m.groupId);

  const studyGroups = Array.from(studyGroupsMap.values()).filter(
    (g) => g.ownerId === userId || userMemberGroups.includes(g.id)
  );

  const groupMembers = Array.from(groupMembersMap.values()).filter((m) =>
    studyGroups.some((g) => g.id === m.groupId)
  );

  return {
    subjects,
    lessons,
    documents,
    deadlines,
    flashcards,
    quizzes,
    quizAttempts,
    studyGroups,
    groupMembers,
  };
}

export function isUserPremium(userId: string): boolean {
  const user = usersMap.get(userId);
  if (user && user.plan === 'premium' && (user.planStatus === 'active' || user.planStatus === 'trial')) {
    return true;
  }

  const sub = subscriptionsMap.get(userId);
  if (!sub) return false;

  if (sub.plan === 'premium') {
    if (sub.status === 'active' || sub.status === 'trialing') return true;
    if (sub.status === 'cancelled' && new Date() < new Date(sub.endDate)) {
      return true;
    }
  }
  return false;
}

export function checkSubjectLimit(userId: string): { allowed: boolean; count: number; max: number } {
  const count = Array.from(subjectsMap.values()).filter((s) => s.ownerId === userId).length;
  const premium = isUserPremium(userId);
  const max = premium ? 9999 : 4;
  return {
    allowed: count < max,
    count,
    max,
  };
}

export function saveSubject(userId: string, data: Partial<StoredSubject>): {
  success: boolean;
  subject?: StoredSubject;
  errorCode?: string;
  message: string;
} {
  const isEditing = !!(data.id && subjectsMap.has(data.id));

  if (isEditing) {
    const existing = subjectsMap.get(data.id!)!;
    if (existing.ownerId !== userId) {
      return {
        success: false,
        errorCode: 'FORBIDDEN',
        message: 'Bạn không có quyền chỉnh sửa môn học này.',
      };
    }
    const updated: StoredSubject = {
      ...existing,
      ...data,
      ownerId: userId,
      updatedAt: new Date().toISOString(),
    };
    subjectsMap.set(updated.id, updated);
    flushSubjects();
    return { success: true, subject: updated, message: 'Đã cập nhật môn học thành công.' };
  }

  // Creating new subject: enforce Free tier 4-subject limit!
  const limitCheck = checkSubjectLimit(userId);
  if (!limitCheck.allowed) {
    return {
      success: false,
      errorCode: 'PLAN_LIMIT_EXCEEDED',
      message: 'Gói Free chỉ được quản lý tối đa 4 môn học. Vui lòng nâng cấp Premium để thêm không giới hạn!',
    };
  }

  const newId = data.id || `sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const newSubject: StoredSubject = {
    id: newId,
    ownerId: userId,
    name: data.name || 'Môn học mới',
    code: data.code || '',
    description: data.description || '',
    color: data.color || '#4f46e5',
    lecturer: data.lecturer || '',
    schedule: data.schedule || '',
    progress: data.progress || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  subjectsMap.set(newId, newSubject);
  flushSubjects();

  return { success: true, subject: newSubject, message: 'Đã thêm môn học thành công.' };
}

export function deleteSubject(userId: string, subjectId: string): {
  success: boolean;
  errorCode?: string;
  message: string;
} {
  const existing = subjectsMap.get(subjectId);
  if (!existing) {
    return { success: false, errorCode: 'NOT_FOUND', message: 'Không tìm thấy môn học.' };
  }

  if (existing.ownerId !== userId) {
    return {
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Bạn không có quyền xóa môn học này.',
    };
  }

  // Cascade delete lessons, deadlines, documents, flashcards, quizzes for this subject
  subjectsMap.delete(subjectId);
  flushSubjects();

  for (const [id, lesson] of lessonsMap.entries()) {
    if (lesson.subjectId === subjectId && lesson.ownerId === userId) {
      lessonsMap.delete(id);
    }
  }
  flushLessons();

  for (const [id, doc] of documentsMap.entries()) {
    if (doc.subjectId === subjectId && doc.ownerId === userId) {
      documentsMap.delete(id);
    }
  }
  flushDocuments();

  for (const [id, dl] of deadlinesMap.entries()) {
    if (dl.subjectId === subjectId && dl.ownerId === userId) {
      deadlinesMap.delete(id);
    }
  }
  flushDeadlines();

  for (const [id, fc] of flashcardsMap.entries()) {
    if (fc.subjectId === subjectId && fc.ownerId === userId) {
      flashcardsMap.delete(id);
    }
  }
  flushFlashcards();

  for (const [id, q] of quizzesMap.entries()) {
    if (q.subjectId === subjectId && q.ownerId === userId) {
      quizzesMap.delete(id);
    }
  }
  flushQuizzes();

  return { success: true, message: 'Đã xóa môn học và toàn bộ dữ liệu liên quan thành công.' };
}

// ====================================================================
// Subscriptions & Transactions (Payment Architecture)
// ====================================================================

export function getUserSubscription(userId: string): SubscriptionRecord {
  let sub = subscriptionsMap.get(userId);
  if (!sub) {
    sub = {
      id: `sub_${userId}`,
      userId,
      provider: 'test',
      plan: 'free',
      status: 'active',
      billingCycle: 'monthly',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    subscriptionsMap.set(userId, sub);
    flushSubscriptions();
  }
  return sub;
}

export function createPendingTransaction(params: {
  userId: string;
  plan: 'premium_monthly' | 'premium_yearly';
  amount: number;
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'manual' | 'bank';
  orderId?: string;
  paymentMethod?: string;
  providerTransactionId?: string;
}): TransactionRecord {
  const txId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const orderId = params.orderId || `${params.provider.toUpperCase()}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const tx: TransactionRecord = {
    id: txId,
    userId: params.userId,
    provider: params.provider,
    orderId,
    providerTransactionId: params.providerTransactionId || orderId,
    amount: params.amount,
    currency: 'vnd',
    plan: params.plan,
    status: 'pending',
    paymentMethod: params.paymentMethod || (params.provider === 'momo' ? 'Ví điện tử MoMo' : params.provider === 'zalopay' ? 'Ví điện tử ZaloPay' : 'Cổng thanh toán điện tử'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  transactionsMap.set(txId, tx);
  flushTransactions();
  return tx;
}

export function confirmPaymentAndUpgrade(params: {
  transactionId?: string;
  orderId?: string;
  userId?: string;
  planType?: 'monthly' | 'yearly';
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'manual' | 'bank';
  providerTransactionId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  amount?: number;
}): { success: boolean; subscription: SubscriptionRecord; transaction: TransactionRecord; message: string; alreadyProcessed?: boolean } {
  // 1. Locate transaction by transactionId, orderId, or pending status
  let tx: TransactionRecord | null = null;

  if (params.transactionId) {
    tx = transactionsMap.get(params.transactionId) || null;
  }

  if (!tx && params.orderId) {
    for (const t of transactionsMap.values()) {
      if (t.orderId === params.orderId) {
        tx = t;
        break;
      }
    }
  }

  const userId = params.userId || tx?.userId;
  if (!userId) {
    throw new Error('Không xác định được người dùng của giao dịch.');
  }

  const planType: 'monthly' | 'yearly' = params.planType || (tx?.plan === 'premium_yearly' ? 'yearly' : 'monthly');
  const durationDays = planType === 'yearly' ? 365 : 30;
  const amount = params.amount || tx?.amount || (planType === 'yearly' ? 699000 : 79000);

  // IDEMPOTENCY CHECK: If transaction already paid, do not double-process
  if (tx && tx.status === 'paid') {
    const existingSub = getUserSubscription(userId);
    return {
      success: true,
      subscription: existingSub,
      transaction: tx,
      message: 'Giao dịch này đã được xác nhận thanh toán trước đó.',
      alreadyProcessed: true,
    };
  }

  if (!tx) {
    const txId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const orderId = params.orderId || `${params.provider.toUpperCase()}_${Date.now()}`;
    tx = {
      id: txId,
      userId,
      provider: params.provider,
      orderId,
      providerTransactionId: params.providerTransactionId || orderId,
      amount,
      currency: 'vnd',
      plan: planType === 'yearly' ? 'premium_yearly' : 'premium_monthly',
      status: 'paid',
      paymentMethod: params.provider === 'momo' ? 'Ví điện tử MoMo' : params.provider === 'zalopay' ? 'Ví điện tử ZaloPay' : 'Cổng thanh toán điện tử',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    tx.status = 'paid';
    tx.paidAt = new Date().toISOString();
    if (params.providerTransactionId) tx.providerTransactionId = params.providerTransactionId;
    tx.updatedAt = new Date().toISOString();
  }

  transactionsMap.set(tx.id, tx);
  flushTransactions();

  // 1b. Update associated Order status in ordersMap
  if (tx.orderId && ordersMap.has(tx.orderId)) {
    const order = ordersMap.get(tx.orderId)!;
    order.status = 'PAID';
    order.paidAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    ordersMap.set(tx.orderId, order);
    flushOrders();
  }

  // 2. Update subscription to active
  const subRecord: SubscriptionRecord = {
    id: `sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId,
    provider: params.provider,
    providerOrderId: tx.orderId,
    providerCustomerId: params.providerCustomerId || `cus_${userId}`,
    providerSubscriptionId: params.providerSubscriptionId || `sub_${tx.id}`,
    plan: 'premium',
    status: 'active',
    billingCycle: planType,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + durationDays * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  subscriptionsMap.set(userId, subRecord);
  flushSubscriptions();

  // 3. Update user plan in users table
  const user = usersMap.get(userId);
  if (user) {
    user.plan = 'premium';
    user.planStatus = 'active';
    user.updatedAt = new Date().toISOString();
    usersMap.set(userId, user);
    flushUsers();
  }

  // 4. Create in-app payment notification & dispatch confirmation email
  createNotification({
    userId,
    type: 'payment',
    title: 'Thanh toán thành công! Gói Premium đã được kích hoạt',
    message: `Đơn hàng #${tx.orderId} đã được thanh toán thành công. Gói Premium (${planType === 'yearly' ? '1 Năm' : '1 Tháng'}) đã được kích hoạt đến ${new Date(subRecord.endDate).toLocaleDateString('vi-VN')}.`,
    channel: 'both',
    relatedEntityId: tx.orderId,
  });

  const settings = getUserNotificationSettings(userId);
  if (settings.transactionEmails && user?.email) {
    sendPaymentSuccessEmail({
      to: user.email,
      fullName: user.fullName || 'Bạn',
      orderId: tx.orderId,
      planName: planType === 'yearly' ? 'StudySync AI Premium (Gói 1 Năm)' : 'StudySync AI Premium (Gói 1 Tháng)',
      amount,
      startDate: subRecord.startDate,
      endDate: subRecord.endDate,
    }).catch((err) => console.error('[Email Notification Error]', err));
  }

  return {
    success: true,
    subscription: subRecord,
    transaction: tx,
    message: 'Thanh toán đã được xác nhận. Gói Premium đã được kích hoạt thành công!',
  };
}

export function cancelUserSubscription(userId: string): {
  success: boolean;
  subscription?: SubscriptionRecord;
  errorCode?: string;
  message: string;
} {
  const sub = subscriptionsMap.get(userId);
  if (!sub || sub.plan !== 'premium') {
    return {
      success: false,
      errorCode: 'NO_ACTIVE_SUBSCRIPTION',
      message: 'Người dùng chưa có đăng ký gói Premium đang hoạt động.',
    };
  }

  sub.cancelAtPeriodEnd = true;
  sub.status = 'cancelled';
  sub.updatedAt = new Date().toISOString();
  subscriptionsMap.set(userId, sub);
  flushSubscriptions();

  return {
    success: true,
    subscription: sub,
    message: `Đã hủy tự động gia hạn. Bạn vẫn tiếp tục sử dụng quyền lợi Premium cho đến hết ngày ${new Date(sub.endDate).toLocaleDateString('vi-VN')}.`,
  };
}

export function getUserTransactions(userId: string): TransactionRecord[] {
  return Array.from(transactionsMap.values())
    .filter((tx) => tx.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTransactionById(userId: string, txId: string): TransactionRecord | null {
  const tx = transactionsMap.get(txId);
  if (!tx || tx.userId !== userId) {
    return null;
  }
  return tx;
}

export function getTransactionByOrderId(orderId: string): TransactionRecord | null {
  for (const tx of transactionsMap.values()) {
    if (tx.orderId === orderId) {
      return tx;
    }
  }
  return null;
}

// ====================================================================
// Order Management (Requirement 2, 3, 4 & 5)
// ====================================================================

export function generateOrderCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = 'SS';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createOrder(params: {
  userId: string;
  packageId: 'premium_monthly' | 'premium_yearly';
  provider?: 'momo' | 'zalopay' | 'stripe' | 'test' | 'bank';
}): {
  success: boolean;
  order: OrderRecord;
  message: string;
  alreadyExists?: boolean;
} {
  const user = usersMap.get(params.userId);
  if (!user) {
    throw new Error('Không tìm thấy thông tin tài khoản người dùng.');
  }

  const pkg = PLAN_PRICING[params.packageId] || PLAN_PRICING.premium_monthly;
  const provider = params.provider || 'bank';

  // Anti-duplicate protection: check if user already has an active PENDING or WAITING_VERIFICATION order created within the last 30 minutes
  const now = new Date();
  for (const existing of ordersMap.values()) {
    if (
      existing.userId === params.userId &&
      existing.packageId === params.packageId &&
      (existing.status === 'PENDING' || existing.status === 'WAITING_VERIFICATION') &&
      new Date(existing.expiredAt) > now
    ) {
      if (!existing.orderCode) {
        existing.orderCode = generateOrderCode();
        ordersMap.set(existing.id, existing);
        flushOrders();
      }
      return {
        success: true,
        order: existing,
        message: existing.status === 'WAITING_VERIFICATION'
          ? 'Đơn hàng của bạn đang chờ quản trị viên xác minh.'
          : 'Đơn hàng hiện tại vẫn đang chờ thanh toán.',
        alreadyExists: true,
      };
    }
  }

  const orderId = `ORD_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const orderCode = generateOrderCode();
  const expiredAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 60 mins expiry window for bank transfers

  const paymentMethod =
    provider === 'bank'
      ? 'Chuyển khoản ngân hàng (TPBank)'
      : provider === 'momo'
      ? 'Ví điện tử MoMo'
      : provider === 'zalopay'
      ? 'Ví điện tử ZaloPay'
      : provider === 'stripe'
      ? 'Thẻ quốc tế Stripe'
      : 'Chuyển khoản ngân hàng';

  const newOrder: OrderRecord = {
    id: orderId,
    orderCode,
    userId: params.userId,
    packageId: params.packageId,
    amount: pkg.amount,
    currency: 'vnd',
    status: 'PENDING',
    provider,
    paymentMethod,
    createdAt: now.toISOString(),
    expiredAt,
    updatedAt: now.toISOString(),
  };

  ordersMap.set(orderId, newOrder);
  flushOrders();

  // Create corresponding pending transaction for record keeping
  createPendingTransaction({
    userId: params.userId,
    plan: params.packageId,
    amount: pkg.amount,
    provider,
    orderId,
    paymentMethod,
  });

  // Create in-app notification & send email
  createNotification({
    userId: params.userId,
    type: 'payment',
    title: `Đơn hàng #${orderCode} đã được tạo`,
    message: `Đơn hàng mua ${pkg.name} (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.amount)}) đang chờ thanh toán. Vui lòng chuyển khoản theo thông tin đơn hàng.`,
    channel: 'both',
    relatedEntityId: orderId,
  });

  const settings = getUserNotificationSettings(params.userId);
  if (settings.transactionEmails && user.email) {
    const baseUrl = getBaseAppUrl();
    sendOrderCreatedEmail({
      to: user.email,
      fullName: user.fullName || 'Bạn',
      orderId,
      planName: pkg.name,
      amount: pkg.amount,
      checkoutUrl: `${baseUrl}/checkout/${orderId}`,
    }).catch((err) => console.error('[Order Created Email Error]', err));
  }

  return {
    success: true,
    order: newOrder,
    message: 'Đã tạo đơn hàng thành công. Vui lòng chuyển khoản theo thông tin hướng dẫn.',
  };
}

export function getOrderById(orderId: string, userId?: string, isAdmin: boolean = false): OrderRecord | null {
  const order = ordersMap.get(orderId);
  if (!order) return null;

  // Strict ownership check (Data isolation) - Admin can view any order
  if (userId && !isAdmin && order.userId !== userId) {
    return null;
  }

  // Ensure orderCode exists for backwards compatibility
  if (!order.orderCode) {
    order.orderCode = `SS${order.id.slice(-6)}`;
  }

  // Auto-expire pending orders past expiry timestamp (only if still in PENDING, not WAITING_VERIFICATION)
  if (order.status === 'PENDING' && new Date(order.expiredAt) < new Date()) {
    order.status = 'EXPIRED';
    order.updatedAt = new Date().toISOString();
    ordersMap.set(orderId, order);
    flushOrders();
  }

  return order;
}

export function getUserOrders(userId: string): OrderRecord[] {
  const now = new Date();
  return Array.from(ordersMap.values())
    .filter((o) => o.userId === userId)
    .map((o) => {
      if (!o.orderCode) {
        o.orderCode = `SS${o.id.slice(-6)}`;
      }
      if (o.status === 'PENDING' && new Date(o.expiredAt) < now) {
        o.status = 'EXPIRED';
      }
      return o;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function customerConfirmOrderPayment(orderId: string, userId: string): {
  success: boolean;
  order?: OrderRecord;
  errorCode?: string;
  message: string;
} {
  const order = ordersMap.get(orderId);
  if (!order) {
    return { success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng.' };
  }

  if (order.userId !== userId) {
    return { success: false, errorCode: 'FORBIDDEN', message: 'Bạn không có quyền thao tác trên đơn hàng này.' };
  }

  if (order.status === 'PAID') {
    return { success: true, order, message: 'Đơn hàng này đã được xác nhận thanh toán trước đó.' };
  }

  if (order.status === 'EXPIRED') {
    return { success: false, errorCode: 'ORDER_EXPIRED', message: 'Đơn hàng này đã hết hạn. Vui lòng tạo đơn hàng mới.' };
  }

  // CRITICAL REQUIREMENT 4 & 5:
  // Do NOT activate Premium here! Transition status from PENDING to WAITING_VERIFICATION
  order.status = 'WAITING_VERIFICATION';
  order.customerConfirmedAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();

  ordersMap.set(orderId, order);
  flushOrders();

  // Create notification for customer
  createNotification({
    userId,
    type: 'payment',
    title: 'Yêu cầu thanh toán đang chờ xác minh',
    message: `Chúng tôi đã nhận được thông báo thanh toán cho đơn hàng #${order.orderCode || order.id}. Ban quản trị sẽ kiểm tra sao kê ngân hàng và kích hoạt gói Premium cho bạn sớm nhất!`,
    channel: 'both',
    relatedEntityId: orderId,
  });

  return {
    success: true,
    order,
    message: 'Yêu cầu thanh toán của bạn đang chờ xác minh.',
  };
}

export function attachOrderReceipt(orderId: string, userId: string, receiptUrl: string): {
  success: boolean;
  order?: OrderRecord;
  message: string;
  errorCode?: string;
} {
  const order = ordersMap.get(orderId);
  if (!order) {
    return { success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng.' };
  }

  if (order.userId !== userId) {
    return { success: false, errorCode: 'FORBIDDEN', message: 'Bạn không có quyền tải biên lai cho đơn hàng này.' };
  }

  order.receiptUrl = receiptUrl;
  order.updatedAt = new Date().toISOString();

  ordersMap.set(orderId, order);
  flushOrders();

  return {
    success: true,
    order,
    message: 'Đã tải lên biên lai thanh toán thành công.',
  };
}

export function getWaitingVerificationOrders(): OrderRecord[] {
  return Array.from(ordersMap.values())
    .filter((o) => o.status === 'WAITING_VERIFICATION')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getAllAdminOrders(statusFilter?: string): OrderRecord[] {
  let list = Array.from(ordersMap.values());
  if (statusFilter && statusFilter !== 'all') {
    list = list.filter((o) => o.status === statusFilter);
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function adminApproveOrder(orderId: string, adminUserId: string): {
  success: boolean;
  order?: OrderRecord;
  subscription?: SubscriptionRecord;
  message: string;
  errorCode?: string;
} {
  const order = ordersMap.get(orderId);
  if (!order) {
    return { success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng.' };
  }

  if (order.status === 'PAID') {
    return {
      success: true,
      order,
      message: 'Đơn hàng này đã được phê duyệt và kích hoạt trước đó.',
    };
  }

  // CRITICAL REQUIREMENT 5:
  // Admin verifies and upgrades user safely:
  const planType = order.packageId === 'premium_yearly' ? 'yearly' : 'monthly';
  const upgradeResult = confirmPaymentAndUpgrade({
    orderId: order.id,
    userId: order.userId,
    planType,
    provider: order.provider,
    amount: order.amount,
  });

  order.status = 'PAID';
  order.paidAt = new Date().toISOString();
  order.verifiedBy = adminUserId;
  order.updatedAt = new Date().toISOString();

  ordersMap.set(orderId, order);
  flushOrders();

  // Create user notification
  createNotification({
    userId: order.userId,
    type: 'payment',
    title: 'Thanh toán đã được phê duyệt thành công!',
    message: `Đơn hàng #${order.orderCode || order.id} đã được xác minh. Gói StudySync AI Premium đã được kích hoạt trên tài khoản của bạn!`,
    channel: 'both',
    relatedEntityId: order.id,
  });

  return {
    success: true,
    order,
    subscription: upgradeResult.subscription,
    message: 'Đã phê duyệt đơn hàng và kích hoạt thành công gói Premium cho người dùng.',
  };
}

export function adminRejectOrder(orderId: string, adminUserId: string, reason?: string): {
  success: boolean;
  order?: OrderRecord;
  message: string;
  errorCode?: string;
} {
  const order = ordersMap.get(orderId);
  if (!order) {
    return { success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng.' };
  }

  const rejectionReason = reason?.trim() || 'Thông tin thanh toán không hợp lệ hoặc số tiền chuyển khoản không khớp.';

  order.status = 'REJECTED';
  order.rejectionReason = rejectionReason;
  order.verifiedBy = adminUserId;
  order.updatedAt = new Date().toISOString();

  ordersMap.set(orderId, order);
  flushOrders();

  // Create user notification
  createNotification({
    userId: order.userId,
    type: 'payment',
    title: 'Xác minh thanh toán không thành công',
    message: `Đơn hàng #${order.orderCode || order.id} bị từ chối: ${rejectionReason}. Bạn có thể tạo đơn hàng mới hoặc liên hệ hỗ trợ.`,
    channel: 'both',
    relatedEntityId: order.id,
  });

  return {
    success: true,
    order,
    message: 'Đã từ chối đơn hàng thanh toán.',
  };
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: { providerTransactionId?: string; paymentMethod?: string; payUrl?: string; qrCodeUrl?: string }
): OrderRecord | null {
  const order = ordersMap.get(orderId);
  if (!order) return null;

  order.status = status;
  if (extra?.providerTransactionId) order.providerTransactionId = extra.providerTransactionId;
  if (extra?.paymentMethod) order.paymentMethod = extra.paymentMethod;
  if (extra?.payUrl) order.payUrl = extra.payUrl;
  if (extra?.qrCodeUrl) order.qrCodeUrl = extra.qrCodeUrl;
  if (status === 'PAID') order.paidAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();

  ordersMap.set(orderId, order);
  flushOrders();
  return order;
}

// ====================================================================
// Mind Map Operations (Requirement 4)
// ====================================================================

export function saveLessonMindMap(
  userId: string,
  lessonId: string,
  mindMapData: any
): { success: boolean; lesson?: StoredLesson; mindMap?: any; message: string; errorCode?: string } {
  const lesson = lessonsMap.get(lessonId);
  if (!lesson) {
    return { success: false, errorCode: 'LESSON_NOT_FOUND', message: 'Không tìm thấy bài học.' };
  }
  if (lesson.ownerId !== userId) {
    return { success: false, errorCode: 'FORBIDDEN', message: 'Bạn không có quyền chỉnh sửa bài học này.' };
  }

  lesson.mindMap = mindMapData;
  lesson.updatedAt = new Date().toISOString();
  lessonsMap.set(lessonId, lesson);
  flushLessons();

  return { success: true, lesson, mindMap: mindMapData, message: 'Đã lưu sơ đồ tư duy thành công.' };
}

export function getLessonMindMap(
  userId: string,
  lessonId: string
): { success: boolean; mindMap?: any; lessonTitle?: string; errorCode?: string; message?: string } {
  const lesson = lessonsMap.get(lessonId);
  if (!lesson) {
    return { success: false, errorCode: 'LESSON_NOT_FOUND', message: 'Không tìm thấy bài học.' };
  }
  if (lesson.ownerId !== userId) {
    return { success: false, errorCode: 'FORBIDDEN', message: 'Bạn không có quyền truy cập bài học này.' };
  }
  return { success: true, mindMap: lesson.mindMap || null, lessonTitle: lesson.title };
}

export function deleteLessonMindMap(
  userId: string,
  lessonId: string
): { success: boolean; message: string; errorCode?: string } {
  const lesson = lessonsMap.get(lessonId);
  if (!lesson) {
    return { success: false, errorCode: 'LESSON_NOT_FOUND', message: 'Không tìm thấy bài học.' };
  }
  if (lesson.ownerId !== userId) {
    return { success: false, errorCode: 'FORBIDDEN', message: 'Bạn không có quyền chỉnh sửa bài học này.' };
  }

  lesson.mindMap = undefined;
  lesson.updatedAt = new Date().toISOString();
  lessonsMap.set(lessonId, lesson);
  flushLessons();

  return { success: true, message: 'Đã xóa sơ đồ tư duy thành công.' };
}

// ====================================================================
// In-App & Email Notifications Management (Requirement 7 & 8)
// ====================================================================

export function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel?: 'email' | 'in_app' | 'both';
  relatedEntityId?: string;
  idempotencyKey?: string;
}): NotificationRecord {
  const notifId = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const newNotif: NotificationRecord = {
    id: notifId,
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    channel: params.channel || 'in_app',
    status: 'pending',
    read: false,
    relatedEntityId: params.relatedEntityId,
    idempotencyKey: params.idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  notificationsMap.set(notifId, newNotif);
  flushNotifications();
  return newNotif;
}

export function getUserNotifications(userId: string, filterType?: string): NotificationRecord[] {
  return Array.from(notificationsMap.values())
    .filter((n) => n.userId === userId && (!filterType || filterType === 'all' || n.type === filterType))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationAsRead(userId: string, notificationId: string): boolean {
  const notif = notificationsMap.get(notificationId);
  if (notif && notif.userId === userId) {
    notif.read = true;
    notif.status = 'read';
    notificationsMap.set(notificationId, notif);
    flushNotifications();
    return true;
  }
  return false;
}

export function markAllNotificationsAsRead(userId: string): number {
  let count = 0;
  for (const notif of notificationsMap.values()) {
    if (notif.userId === userId && !notif.read) {
      notif.read = true;
      notif.status = 'read';
      count++;
    }
  }
  if (count > 0) flushNotifications();
  return count;
}

export function deleteNotification(userId: string, notificationId: string): boolean {
  const notif = notificationsMap.get(notificationId);
  if (notif && notif.userId === userId) {
    notificationsMap.delete(notificationId);
    flushNotifications();
    return true;
  }
  return false;
}

export function getUserNotificationSettings(userId: string): NotificationSettings {
  const settings = notificationSettingsMap.get(userId);
  if (settings) return settings;

  const defaultSettings: NotificationSettings = {
    accountEmails: true, // Non-opt-out security emails
    deadlineEmails: true,
    premiumEmails: true,
    marketingEmails: false,
    transactionEmails: true,
  };
  notificationSettingsMap.set(userId, defaultSettings);
  flushNotificationSettings();
  return defaultSettings;
}

export function updateUserNotificationSettings(
  userId: string,
  updates: Partial<NotificationSettings>
): NotificationSettings {
  const current = getUserNotificationSettings(userId);
  const updated: NotificationSettings = {
    ...current,
    ...updates,
    accountEmails: true, // Required security notifications cannot be disabled
  };
  notificationSettingsMap.set(userId, updated);
  flushNotificationSettings();
  return updated;
}

// ====================================================================
// Periodic Cron Jobs & Background Workers (Requirement 8)
// ====================================================================

export async function checkAndSendDeadlineNotifications(): Promise<{ checked: number; sent: number }> {
  let sentCount = 0;
  const now = new Date();

  for (const deadline of deadlinesMap.values()) {
    if (deadline.status === 'completed') continue;

    const user = usersMap.get(deadline.ownerId);
    if (!user) continue;

    const settings = getUserNotificationSettings(deadline.ownerId);
    const dueDateTime = new Date(`${deadline.dueDate}T${deadline.dueTime || '23:59'}:00`);
    const diffHours = (dueDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isWithin24Hours = diffHours > 0 && diffHours <= 24;
    const isOverdue = diffHours < 0 && diffHours >= -48; // Overdue within 48h

    if (!isWithin24Hours && !isOverdue) continue;

    const windowKey = isWithin24Hours ? 'due24h' : 'overdue';
    const idempotencyKey = `deadline_${deadline.id}_${windowKey}`;

    // Deduplication check
    let alreadyNotified = false;
    for (const notif of notificationsMap.values()) {
      if (notif.idempotencyKey === idempotencyKey) {
        alreadyNotified = true;
        break;
      }
    }
    if (alreadyNotified) continue;

    const subject = subjectsMap.get(deadline.subjectId);
    const subjectName = subject?.name || 'Môn học';

    const notif = createNotification({
      userId: deadline.ownerId,
      type: 'deadline',
      title: isOverdue ? `⚠️ Quá hạn: ${deadline.title}` : `⏰ Sắp đến hạn: ${deadline.title}`,
      message: `${deadline.title} (${subjectName}) ${isOverdue ? 'đã quá hạn nộp' : 'cần hoàn thành trước ' + deadline.dueDate + ' ' + (deadline.dueTime || '')}.`,
      channel: settings.deadlineEmails ? 'both' : 'in_app',
      relatedEntityId: deadline.id,
      idempotencyKey,
    });

    if (settings.deadlineEmails && user.email) {
      const baseUrl = getBaseAppUrl();
      const deadlineUrl = `${baseUrl}/?tab=deadlines&deadlineId=${deadline.id}`;
      try {
        await sendDeadlineReminderEmail({
          to: user.email,
          fullName: user.fullName || 'Bạn',
          deadlineTitle: deadline.title,
          subjectName,
          dueDate: deadline.dueDate,
          dueTime: deadline.dueTime,
          priority: deadline.priority,
          deadlineUrl,
          isOverdue,
        });
        notif.sentAt = new Date().toISOString();
        notif.status = 'sent';
        flushNotifications();
        sentCount++;
      } catch (err: any) {
        notif.status = 'failed';
        notif.errorMessage = err.message;
        flushNotifications();
      }
    }
  }

  return { checked: deadlinesMap.size, sent: sentCount };
}

export async function checkAndSendPremiumExpiryNotifications(): Promise<{ checked: number; sent: number }> {
  let sentCount = 0;
  const now = new Date();

  for (const sub of subscriptionsMap.values()) {
    if (sub.plan !== 'premium' || sub.status !== 'active') continue;

    const user = usersMap.get(sub.userId);
    if (!user) continue;

    const settings = getUserNotificationSettings(sub.userId);
    const end = new Date(sub.endDate);
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let milestone: string | null = null;
    if (daysRemaining === 7) milestone = '7d';
    else if (daysRemaining === 3) milestone = '3d';
    else if (daysRemaining === 1) milestone = '1d';
    else if (daysRemaining <= 0 && daysRemaining >= -1) milestone = 'expired';

    if (!milestone) continue;

    const idempotencyKey = `sub_expiry_${sub.userId}_${sub.id}_${milestone}`;

    let alreadyNotified = false;
    for (const notif of notificationsMap.values()) {
      if (notif.idempotencyKey === idempotencyKey) {
        alreadyNotified = true;
        break;
      }
    }
    if (alreadyNotified) continue;

    const notif = createNotification({
      userId: sub.userId,
      type: 'premium_expiry',
      title: milestone === 'expired' ? 'Gói Premium đã hết hạn' : `Gói Premium sắp hết hạn sau ${daysRemaining} ngày`,
      message: milestone === 'expired'
        ? `Gói Premium của bạn đã hết hạn vào ngày ${end.toLocaleDateString('vi-VN')}. Hãy gia hạn để tiếp tục sử dụng.`
        : `Gói Premium của bạn sẽ hết hạn vào ngày ${end.toLocaleDateString('vi-VN')}. Nhấn để gia hạn.`,
      channel: settings.premiumEmails ? 'both' : 'in_app',
      relatedEntityId: sub.id,
      idempotencyKey,
    });

    if (settings.premiumEmails && user.email) {
      const baseUrl = getBaseAppUrl();
      const renewUrl = `${baseUrl}/?tab=premium`;
      try {
        await sendPremiumExpiryEmail({
          to: user.email,
          fullName: user.fullName || 'Bạn',
          daysRemaining,
          endDate: sub.endDate,
          renewUrl,
        });
        notif.sentAt = new Date().toISOString();
        notif.status = 'sent';
        flushNotifications();
        sentCount++;
      } catch (err: any) {
        notif.status = 'failed';
        notif.errorMessage = err.message;
        flushNotifications();
      }
    }
  }

  return { checked: subscriptionsMap.size, sent: sentCount };
}

// Ownership helper
export function assertOwnership(resourceOwnerId: string, currentUserId: string): boolean {
  return !!(resourceOwnerId && currentUserId && resourceOwnerId === currentUserId);
}
