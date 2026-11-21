export type UserPlan = 'free' | 'premium';
export type PlanStatus = 'active' | 'trial' | 'expired';

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  school?: string;
  major?: string;
  academicYear?: string;
  timezone?: string;
  language?: string;
  plan: UserPlan;
  planStatus: PlanStatus;
  emailVerified?: boolean;
  status?: 'active' | 'pending_verification' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  description: string;
  color: string;
  lecturer?: string;
  schedule?: string;
  progress: number; // 0 - 100
  lastStudiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MindMapNode {
  title: string;
  summary?: string;
  children?: MindMapNode[];
}

export interface KeyPoint {
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'low';
}

export interface Concept {
  term: string;
  definition: string;
  example?: string;
  importance?: string;
}

export interface Lesson {
  id: string;
  ownerId: string;
  subjectId: string;
  title: string;
  lessonDate: string;
  classroom?: string;
  initialNotes?: string;
  audioUrl?: string;
  audioDuration?: number; // in seconds
  audioSize?: number; // in bytes
  audioMimeType?: string;
  audioFileId?: string;
  storagePath?: string;
  transcript?: string;
  summary?: string;
  keyPoints?: KeyPoint[];
  keywords?: string[];
  concepts?: Concept[];
  mindMap?: MindMapNode;
  transcriptionStatus?: 'idle' | 'uploaded' | 'processing' | 'completed' | 'quota_exceeded' | 'failed';
  transcriptionError?: string;
  summaryStatus?: 'idle' | 'processing' | 'completed' | 'quota_exceeded' | 'failed';
  summaryError?: string;
  aiLastAttemptAt?: string;
  aiModel?: string;
  analysisStatus: 'idle' | 'recorded' | 'uploaded' | 'analyzing' | 'completed' | 'quota_exceeded' | 'failed' | 'error';
  analysisError?: string;
  analyzedAt?: string;
  errorMessage?: string;
  exercises?: Exercise[];
  sourceType: 'audio' | 'document' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  question: string;
  answerGuide?: string;
  title?: string;
  hint?: string;
  solution?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export type DocumentSummaryStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'quota_exceeded';

export interface DocumentItem {
  id: string;
  ownerId: string;
  subjectId: string;
  lessonId?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  extractedText?: string;
  summary?: string;
  keyTakeaways?: string[];
  summaryStatus?: DocumentSummaryStatus;
  summaryCreatedAt?: string;
  summaryModel?: string;
  summaryError?: string;
  summaryVersion?: number;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt?: string;
}

export interface Flashcard {
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
  nextReviewAt?: string;
  correctCount: number;
  incorrectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // 0 - 3 index
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Quiz {
  id: string;
  ownerId: string;
  subjectId: string;
  lessonId?: string;
  title: string;
  questions: QuizQuestion[];
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  ownerId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  completedAt: string;
}

export type DeadlineType = 'assignment' | 'exam' | 'presentation' | 'reading' | 'project' | 'other';
export type DeadlinePriority = 'low' | 'medium' | 'high' | 'urgent';
export type DeadlineStatus = 'todo' | 'in_progress' | 'completed';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ReminderSettings {
  remind1Day: boolean;
  remind3Days: boolean;
  remindDueDay: boolean;
}

export interface Deadline {
  id: string;
  ownerId: string;
  subjectId: string;
  groupId?: string;
  title: string;
  description?: string;
  type: DeadlineType;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: DeadlinePriority;
  status: DeadlineStatus;
  assigneeId?: string;
  assigneeName?: string;
  sourceType: 'manual' | 'ai_transcript' | 'ai_document';
  sourceId?: string;
  sourceText?: string;
  aiConfidence?: number;
  isAiSuggested?: boolean;
  reminderSettings?: ReminderSettings;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyGroup {
  id: string;
  ownerId: string;
  subjectId: string;
  name: string;
  description: string;
  inviteCode: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  fullName: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface GroupComment {
  id: string;
  groupId: string;
  deadlineId?: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: string[];
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  ownerId: string;
  subjectId?: string;
  lessonId?: string;
  title: string;
  scope: 'lesson' | 'subject' | 'general';
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Usage {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  audioMinutes: number;
  aiRequests: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiAnalysisResult {
  transcript: string;
  summary: string;
  keyPoints: KeyPoint[];
  keywords: string[];
  concepts: Concept[];
  mindMap: MindMapNode;
  flashcards: Array<{
    front: string;
    back: string;
    example?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
  }>;
  quizQuestions: QuizQuestion[];
  deadlines: Array<{
    title: string;
    dueDate: string;
    dueTime?: string | null;
    subject?: string;
    type?: DeadlineType;
    priority: DeadlinePriority;
    confidence: number;
    sourceText: string;
  }>;
}

export type SubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type TransactionStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired';

export interface Subscription {
  id: string;
  userId: string;
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'manual' | 'bank';
  providerOrderId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  plan: 'free' | 'premium';
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'manual' | 'bank';
  orderId?: string;
  providerTransactionId: string;
  subscriptionId?: string;
  amount: number;
  currency: 'vnd' | 'usd';
  plan: 'premium_monthly' | 'premium_yearly';
  status: TransactionStatus;
  paymentMethod: string;
  paidAt?: string;
  failureReason?: string;
  rawStatus?: string;
  createdAt: string;
  updatedAt: string;
}
