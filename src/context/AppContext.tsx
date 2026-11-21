import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Subject,
  Lesson,
  Flashcard,
  Quiz,
  QuizAttempt,
  Deadline,
  StudyGroup,
  GroupMember,
  DocumentItem,
  Usage,
} from '../types';
import {
  DEMO_SUBJECTS,
  DEMO_LESSONS,
  DEMO_FLASHCARDS,
  DEMO_QUIZZES,
  DEMO_DEADLINES,
  DEMO_GROUPS,
  DEMO_GROUP_MEMBERS,
  DEMO_USAGE,
} from '../utils/demoData';
import { canCreateSubject, isPremium } from '../utils/planLimits';
import {
  apiRegister,
  apiLogin,
  apiGetMe,
  apiLogout,
  apiGetUserWorkspace,
  apiCreateSubject,
  apiUpdateSubject,
  apiDeleteSubject,
  apiUpdateProfile,
  apiUpdateLanguage,
  deleteAudioFilesBySubject as apiDeleteAudioFilesBySubject,
  deleteAudioFile as apiDeleteAudioFile,
} from '../services/api';
import { Language, translations, Translations, getInitialLanguage, I18nProvider } from '../i18n';

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  authLoading: boolean;
  subjects: Subject[];
  lessons: Lesson[];
  flashcards: Flashcard[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  deadlines: Deadline[];
  studyGroups: StudyGroup[];
  groupMembers: GroupMember[];
  documents: DocumentItem[];
  usage: Usage;
  theme: 'light' | 'dark' | 'system';
  activeTab: string;
  activeSubjectId: string | null;
  activeLessonId: string | null;
  upgradeModalOpen: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  onboardingOpen: boolean;
  toasts: ToastInfo[];

  // Language & i18n
  language: Language;
  setLanguage: (lang: Language, notify?: boolean) => void;
  toggleLanguage: () => void;
  t: Translations;
  formatCurrency: (amount: number) => string;
  formatLocalizedDate: (dateString?: string | null) => string;

  // Setters & Nav
  setActiveTab: (tab: string) => void;
  setActiveSubjectId: (id: string | null) => void;
  setActiveLessonId: (id: string | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setUpgradeModalOpen: (open: boolean) => void;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;
  setOnboardingOpen: (open: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  refreshUserData: () => Promise<void>;

  // Subjects & Cascades
  addSubject: (data: Omit<Subject, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'progress'>) => Promise<boolean>;
  updateSubject: (id: string, data: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<boolean>;
  deleteLessonsBySubject: (subjectId: string) => Promise<void>;
  deleteFlashcardsBySubject: (subjectId: string) => void;
  deleteQuizzesBySubject: (subjectId: string) => void;
  deleteDeadlinesBySubject: (subjectId: string) => void;
  deleteDocumentsBySubject: (subjectId: string) => void;
  deleteAudioFilesBySubject: (subjectId: string) => Promise<void>;

  // Lessons
  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, data: Partial<Lesson>) => void;
  deleteLesson: (id: string) => Promise<boolean>;
  deleteAudioFile: (fileId?: string, lessonId?: string) => Promise<boolean>;

  // Flashcards
  addFlashcards: (newCards: Flashcard[]) => void;
  updateFlashcard: (id: string, data: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => boolean;
  reviewFlashcard: (id: string, remembered: boolean) => void;

  // Quizzes
  addQuiz: (quiz: Quiz) => void;
  deleteQuiz: (id: string) => boolean;
  deleteQuizQuestion: (quizId: string, questionIndex: number) => boolean;
  saveQuizAttempt: (attempt: Omit<QuizAttempt, 'id' | 'ownerId' | 'completedAt'>) => void;

  // Deadlines
  addDeadline: (deadline: Omit<Deadline, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => void;
  updateDeadline: (id: string, data: Partial<Deadline>) => void;
  deleteDeadline: (id: string) => boolean;
  toggleDeadlineChecklistItem: (deadlineId: string, itemId: string) => void;

  // Documents
  addDocument: (doc: DocumentItem) => void;
  updateDocument: (id: string, data: Partial<DocumentItem>) => void;
  deleteDocument: (id: string) => boolean;

  // Groups & Cascade
  createStudyGroup: (name: string, description: string, subjectId: string) => StudyGroup;
  joinStudyGroup: (inviteCode: string) => boolean;
  leaveStudyGroup: (groupId: string) => void;
  deleteStudyGroup: (groupId: string) => boolean;
  deleteGroupMembers: (groupId: string) => void;
  deleteGroupDeadlines: (groupId: string) => void;
  deleteGroupTasks: (groupId: string) => void;

  // Auth & Profile
  login: (email: string, pass: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  upgradeToPremium: () => void;
  downgradeToFree: () => void;
  resetToDemoData: () => void;

  // Usage stats
  incrementAiUsage: (count?: number) => void;
  incrementAudioUsage: (minutes?: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'studymind_user',
  TOKEN: 'studymind_token',
  SUBJECTS: 'studymind_subjects',
  LESSONS: 'studymind_lessons',
  FLASHCARDS: 'studymind_flashcards',
  QUIZZES: 'studymind_quizzes',
  QUIZ_ATTEMPTS: 'studymind_quiz_attempts',
  DEADLINES: 'studymind_deadlines',
  GROUPS: 'studymind_groups',
  GROUP_MEMBERS: 'studymind_group_members',
  DOCUMENTS: 'studymind_documents',
  USAGE: 'studymind_usage',
  THEME: 'studymind_theme',
  LANGUAGE: 'studymind_language',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved as 'light' | 'dark' | 'system') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
  };

  // User auth state: NEVER initialize with hardcoded default user!
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Modals
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Entities state with persistence
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [usage, setUsage] = useState<Usage>({
    id: 'usg_default',
    userId: '',
    month: '2026-10',
    audioMinutes: 0,
    aiRequests: 0,
    documentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Language & i18n state
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Sync language with currentUser when profile loads or changes
  useEffect(() => {
    if (currentUser?.language && (currentUser.language === 'vi' || currentUser.language === 'en')) {
      if (currentUser.language !== language) {
        setLanguageState(currentUser.language as Language);
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, currentUser.language);
        localStorage.setItem('studysync_language', currentUser.language);
        document.documentElement.lang = currentUser.language;
      }
    }
  }, [currentUser?.language, language]);

  const setLanguage = useCallback((lang: Language, notify = false) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
      localStorage.setItem('studysync_language', lang);
      document.documentElement.lang = lang;
    } catch {}

    // Persist to backend database if logged in
    try {
      apiUpdateLanguage(lang)
        .then((res) => {
          if (res && res.user) {
            setCurrentUser((prev) => (prev ? { ...prev, language: lang } : prev));
          }
        })
        .catch(() => {});
    } catch {}

    if (notify) {
      if (lang === 'vi') {
        showToast('Đã đổi ngôn ngữ sang Tiếng Việt (Phím tắt: Ctrl + Shift + L / ⌘ + Shift + L)', 'info');
      } else {
        showToast('Switched language to English (Shortcut: Ctrl + Shift + L / ⌘ + Shift + L)', 'info');
      }
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'vi' ? 'en' : 'vi', true);
  }, [language, setLanguage]);

  // Global Keyboard shortcut listener:
  // Ctrl + Shift + L on Windows/Linux, Cmd + Shift + L on macOS
  // Works on all pages. Cleans up on unmount.
  // NEVER triggers when typing inside input, textarea, select, or contenteditable.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isShift = e.shiftKey;
      const isKeyL = e.key === 'l' || e.key === 'L' || e.code === 'KeyL';
      if (!isShift || !isKeyL) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isModifierMatch = isMac ? e.metaKey : (e.ctrlKey || e.metaKey);
      if (!isModifierMatch) return;

      // Check if user is actively focused/typing in an input field
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const el = activeEl || target;
      if (el) {
        const tagName = el.tagName ? el.tagName.toUpperCase() : '';
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
          return; // Do NOT intercept user input!
        }
        if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
          return; // Do NOT intercept rich text editing!
        }
      }

      e.preventDefault();
      e.stopPropagation();
      toggleLanguage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleLanguage]);

  // Global Document Title & HTML Lang sync
  useEffect(() => {
    document.documentElement.lang = language;

    const titleMap: Record<string, { vi: string; en: string }> = {
      dashboard: { vi: 'Tổng quan', en: 'Dashboard' },
      subjects: { vi: 'Môn học', en: 'Courses' },
      'subject-detail': { vi: 'Chi tiết môn học', en: 'Course Details' },
      recorder: { vi: 'Ghi âm bài giảng', en: 'Lecture Recorder' },
      'debug-audio': { vi: 'Kiểm tra Audio', en: 'Audio Debugger' },
      documents: { vi: 'Tài liệu học tập', en: 'Study Documents' },
      flashcards: { vi: 'Flashcards', en: 'Flashcards' },
      quizzes: { vi: 'Trắc nghiệm AI', en: 'AI Quizzes' },
      deadlines: { vi: 'Quản lý Deadline', en: 'Deadlines' },
      groups: { vi: 'Nhóm học tập', en: 'Study Groups' },
      'ai-chat': { vi: 'Trợ giảng AI', en: 'AI Tutor' },
      premium: { vi: 'Gói Premium VIP', en: 'Premium VIP Plan' },
      checkout: { vi: 'Thanh toán đơn hàng', en: 'Checkout' },
      'payment-success': { vi: 'Thanh toán thành công', en: 'Payment Success' },
      'payment-failed': { vi: 'Thanh toán thất bại', en: 'Payment Failed' },
      transactions: { vi: 'Lịch sử giao dịch', en: 'Transaction History' },
      profile: { vi: 'Hồ sơ người dùng', en: 'User Profile' },
      settings: { vi: 'Cài đặt hệ thống', en: 'Settings' },
      'verify-email': { vi: 'Xác minh Email', en: 'Verify Email' },
      'reset-password': { vi: 'Đặt lại mật khẩu', en: 'Reset Password' },
      landing: { vi: 'Trang chủ', en: 'Home' },
    };

    const pageName = titleMap[activeTab]
      ? titleMap[activeTab][language]
      : (language === 'vi' ? 'Học tập thông minh' : 'Smart Learning');
    const baseName = 'Mầm Study';
    const tagline =
      language === 'vi'
        ? 'Trợ lý thông minh cho sinh viên hiện đại'
        : 'Smart Assistant for Modern Students';

    if (activeTab === 'landing') {
      document.title = `${baseName} - ${tagline}`;
    } else {
      document.title = `${pageName} | ${baseName}`;
    }
  }, [language, activeTab]);

  const formatCurrency = useCallback(
    (amount: number) => {
      if (language === 'en') {
        const usd = (amount / 25000).toFixed(2);
        return `$${usd}`;
      }
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },
    [language]
  );

  const formatLocalizedDate = useCallback(
    (dateString?: string | null) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return dateString;
      }
    },
    [language]
  );

  // Auth Modals
  const openAuthModal = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Load user workspace from server
  const loadUserWorkspace = useCallback(async () => {
    try {
      const workspace = await apiGetUserWorkspace();
      if (workspace && workspace.success) {
        setSubjects(workspace.subjects || []);
        setLessons(workspace.lessons || []);
        setDocuments(workspace.documents || []);
        setDeadlines(workspace.deadlines || []);
        setFlashcards(workspace.flashcards || []);
        setQuizzes(workspace.quizzes || []);
      }
    } catch (err) {
      console.warn('Could not load user workspace:', err);
    }
  }, []);

  // Refresh User Data (Profile, Subscription & Workspace)
  const refreshUserData = useCallback(async () => {
    try {
      const meRes = await apiGetMe();
      if (meRes && meRes.user) {
        setCurrentUser(meRes.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(meRes.user));
      }
      await loadUserWorkspace();
    } catch (err) {
      console.warn('Could not refresh user data:', err);
    }
  }, [loadUserWorkspace]);

  // Initial Authentication Verification & Session Restore
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      setAuthLoading(true);
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

      // Check URL pathname or tab parameter first (e.g. /verify-email?token=... or /?tab=verify-email)
      const pathname = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam =
        urlParams.get('tab') ||
        (pathname.startsWith('/verify-email')
          ? 'verify-email'
          : pathname.startsWith('/reset-password')
          ? 'reset-password'
          : null);
      if (tabParam) {
        setActiveTab(tabParam);
      }

      if (!token) {
        if (isMounted) {
          setCurrentUser(null);
          setAuthLoading(false);
          if (!tabParam) setActiveTab('landing');
        }
        return;
      }

      try {
        const meRes = await apiGetMe();
        if (isMounted && meRes && meRes.user) {
          setCurrentUser(meRes.user);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(meRes.user));

          // Load user workspace
          await loadUserWorkspace();

          if (!tabParam) {
            if (!meRes.user.emailVerified && meRes.user.status === 'pending_verification') {
              setActiveTab('verify-email');
            } else {
              setActiveTab('dashboard');
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          setCurrentUser(null);
          if (!tabParam) setActiveTab('landing');
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [loadUserWorkspace]);

  // ====================================================================
  // Granular Deletion & Cascade Helpers
  // ====================================================================

  const deleteLessonsBySubject = async (subjectId: string): Promise<void> => {
    setLessons((prev) => prev.filter((l) => l.subjectId !== subjectId));
    if (activeLessonId) {
      const activeLes = lessons.find((l) => l.id === activeLessonId);
      if (activeLes && activeLes.subjectId === subjectId) {
        setActiveLessonId(null);
      }
    }
  };

  const deleteFlashcardsBySubject = (subjectId: string) => {
    setFlashcards((prev) => prev.filter((f) => f.subjectId !== subjectId));
  };

  const deleteQuizzesBySubject = (subjectId: string) => {
    setQuizzes((prev) => prev.filter((q) => q.subjectId !== subjectId));
  };

  const deleteDeadlinesBySubject = (subjectId: string) => {
    setDeadlines((prev) =>
      prev.filter((d) => {
        if (d.subjectId === subjectId) {
          if (!d.groupId && d.ownerId === currentUser?.id) return false;
          if (!d.groupId) return false;
        }
        return true;
      })
    );
  };

  const deleteDocumentsBySubject = (subjectId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.subjectId !== subjectId));
  };

  const deleteAudioFilesBySubject = async (subjectId: string): Promise<void> => {
    try {
      await apiDeleteAudioFilesBySubject(subjectId);
    } catch (err) {
      console.warn('Lỗi khi xóa file âm thanh trên máy chủ:', err);
    }
  };

  // Subject Operations with strict plan limit check & Cascade Delete
  const addSubject = async (data: Omit<Subject, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'progress'>): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal('login');
      showToast(
        language === 'vi' ? 'Vui lòng đăng nhập để thêm môn học.' : 'Please sign in to add a course.',
        'warning'
      );
      return false;
    }

    // Check plan limits (Free max 4 subjects)
    if (!canCreateSubject(currentUser, subjects.length)) {
      setUpgradeModalOpen(true);
      showToast(
        language === 'vi'
          ? 'Gói Free chỉ được quản lý tối đa 4 môn học. Vui lòng nâng cấp Premium để thêm không giới hạn!'
          : 'Free plan allows up to 4 courses. Please upgrade to Premium for unlimited courses!',
        'warning'
      );
      return false;
    }

    try {
      const res = await apiCreateSubject(data);
      if (res && res.subject) {
        setSubjects((prev) => [res.subject, ...prev]);
        showToast(
          language === 'vi'
            ? `Đã thêm môn học "${res.subject.name}" thành công!`
            : `Added course "${res.subject.name}" successfully!`,
          'success'
        );
        return true;
      }
    } catch (err: any) {
      if (err.errorCode === 'FREE_PLAN_LIMIT_REACHED') {
        setUpgradeModalOpen(true);
      }
      showToast(err.message || (language === 'vi' ? 'Không thể tạo môn học.' : 'Could not create course.'), 'error');
      return false;
    }

    return false;
  };

  const updateSubject = async (id: string, data: Partial<Subject>): Promise<void> => {
    try {
      const res = await apiUpdateSubject(id, data);
      if (res && res.subject) {
        setSubjects((prev) => prev.map((s) => (s.id === id ? res.subject : s)));
        showToast(
          language === 'vi' ? 'Đã cập nhật môn học thành công.' : 'Course updated successfully.',
          'success'
        );
      }
    } catch (err: any) {
      showToast(
        err.message || (language === 'vi' ? 'Không thể cập nhật môn học.' : 'Could not update course.'),
        'error'
      );
    }
  };

  const deleteSubject = async (id: string): Promise<boolean> => {
    try {
      await apiDeleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      await deleteLessonsBySubject(id);
      deleteFlashcardsBySubject(id);
      deleteQuizzesBySubject(id);
      deleteDeadlinesBySubject(id);
      deleteDocumentsBySubject(id);
      await deleteAudioFilesBySubject(id);

      if (activeSubjectId === id) {
        setActiveSubjectId(null);
        setActiveTab('subjects');
      }

      showToast(
        language === 'vi'
          ? 'Đã xóa môn học và toàn bộ dữ liệu liên quan thành công!'
          : 'Deleted course and all related data successfully!',
        'success'
      );
      return true;
    } catch (err: any) {
      showToast(
        err.message || (language === 'vi' ? 'Không thể xóa môn học.' : 'Could not delete course.'),
        'error'
      );
      return false;
    }
  };

  // Lesson Operations
  const addLesson = (lesson: Lesson) => {
    setLessons((prev) => {
      const existingIdx = prev.findIndex((l) => l.id === lesson.id);
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], ...lesson, updatedAt: new Date().toISOString() };
        return next;
      }
      return [lesson, ...prev];
    });
    showToast(
      language === 'vi'
        ? `Đã lưu bài học "${lesson.title}" thành công!`
        : `Saved lesson "${lesson.title}" successfully!`,
      'success'
    );
  };

  const updateLesson = (id: string, data: Partial<Lesson>) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l))
    );
  };

  const deleteLesson = async (id: string): Promise<boolean> => {
    const target = lessons.find((l) => l.id === id);
    if (target?.audioFileId) {
      await deleteAudioFile(target.audioFileId, id);
    }
    setLessons((prev) => prev.filter((l) => l.id !== id));
    if (activeLessonId === id) {
      setActiveLessonId(null);
    }
    showToast(
      language === 'vi' ? 'Đã xóa bài học thành công.' : 'Lesson deleted successfully.',
      'info'
    );
    return true;
  };

  const deleteAudioFile = async (fileId?: string, _lessonId?: string): Promise<boolean> => {
    try {
      if (fileId) {
        await apiDeleteAudioFile(fileId);
      }
      return true;
    } catch (err) {
      console.warn('Error deleting audio file:', err);
      return false;
    }
  };

  // Flashcards Operations
  const addFlashcards = (newCards: Flashcard[]) => {
    setFlashcards((prev) => [...newCards, ...prev]);
    showToast(
      language === 'vi'
        ? `Đã thêm ${newCards.length} flashcard mới!`
        : `Added ${newCards.length} new flashcard(s)!`,
      'success'
    );
  };

  const updateFlashcard = (id: string, data: Partial<Flashcard>) => {
    setFlashcards((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f))
    );
  };

  const deleteFlashcard = (id: string): boolean => {
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
    showToast(
      language === 'vi' ? 'Đã xóa flashcard thành công.' : 'Flashcard deleted successfully.',
      'info'
    );
    return true;
  };

  const reviewFlashcard = (id: string, remembered: boolean) => {
    setFlashcards((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const newCorrect = remembered ? f.correctCount + 1 : f.correctCount;
        const newIncorrect = !remembered ? f.incorrectCount + 1 : f.incorrectCount;
        const status = newCorrect >= 3 ? 'mastered' : newCorrect > 0 ? 'learning' : 'new';
        return {
          ...f,
          correctCount: newCorrect,
          incorrectCount: newIncorrect,
          reviewStatus: status,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Quizzes Operations
  const addQuiz = (quiz: Quiz) => {
    setQuizzes((prev) => [quiz, ...prev]);
    showToast(
      language === 'vi'
        ? `Đã tạo bộ trắc nghiệm "${quiz.title}"!`
        : `Created quiz "${quiz.title}"!`,
      'success'
    );
  };

  const deleteQuiz = (id: string): boolean => {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    setQuizAttempts((prev) => prev.filter((a) => a.quizId !== id));
    showToast(
      language === 'vi' ? 'Đã xóa bộ câu hỏi trắc nghiệm.' : 'Quiz deleted successfully.',
      'info'
    );
    return true;
  };

  const deleteQuizQuestion = (quizId: string, questionIndex: number): boolean => {
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== quizId) return q;
        const updated = [...q.questions];
        updated.splice(questionIndex, 1);
        return { ...q, questions: updated };
      })
    );
    showToast(
      language === 'vi' ? 'Đã xóa câu hỏi khỏi bộ đề.' : 'Question removed from quiz.',
      'info'
    );
    return true;
  };

  const saveQuizAttempt = (attempt: Omit<QuizAttempt, 'id' | 'ownerId' | 'completedAt'>) => {
    if (!currentUser) return;
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `att_${Date.now()}`,
      ownerId: currentUser.id,
      completedAt: new Date().toISOString(),
    };
    setQuizAttempts((prev) => [newAttempt, ...prev]);
  };

  // Deadlines Operations
  const addDeadline = (deadline: Omit<Deadline, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    const newDeadline: Deadline = {
      ...deadline,
      id: `dl_${Date.now()}`,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDeadlines((prev) => [newDeadline, ...prev]);
    showToast(
      language === 'vi'
        ? `Đã thêm hạn chót "${newDeadline.title}"!`
        : `Added deadline "${newDeadline.title}"!`,
      'success'
    );
  };

  const updateDeadline = (id: string, data: Partial<Deadline>) => {
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d))
    );
  };

  const deleteDeadline = (id: string): boolean => {
    setDeadlines((prev) => prev.filter((d) => d.id !== id));
    showToast(
      language === 'vi' ? 'Đã xóa hạn chót thành công.' : 'Deadline deleted successfully.',
      'info'
    );
    return true;
  };

  const toggleDeadlineChecklistItem = (deadlineId: string, itemId: string) => {
    setDeadlines((prev) =>
      prev.map((d) => {
        if (d.id !== deadlineId || !d.checklist) return d;
        const updated = d.checklist.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        return { ...d, checklist: updated, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Documents Operations
  const addDocument = (doc: DocumentItem) => {
    setDocuments((prev) => {
      const existingIdx = prev.findIndex((d) => d.id === doc.id);
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], ...doc, updatedAt: new Date().toISOString() };
        return next;
      }
      return [doc, ...prev];
    });
    showToast(
      language === 'vi'
        ? `Đã thêm tài liệu "${doc.fileName}"!`
        : `Added document "${doc.fileName}"!`,
      'success'
    );
  };

  const updateDocument = (id: string, data: Partial<DocumentItem>) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, ...data, updatedAt: new Date().toISOString() } : doc))
    );
  };

  const deleteDocument = (id: string): boolean => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    showToast(
      language === 'vi' ? 'Đã xóa tài liệu thành công.' : 'Document deleted successfully.',
      'info'
    );
    return true;
  };

  // Study Groups
  const createStudyGroup = (name: string, description: string, subjectId: string): StudyGroup => {
    const ownerId = currentUser ? currentUser.id : 'usr_demo';
    const newGroup: StudyGroup = {
      id: `grp_${Date.now()}`,
      ownerId,
      subjectId,
      name,
      description,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    setStudyGroups((prev) => [newGroup, ...prev]);

    if (currentUser) {
      const ownerMember: GroupMember = {
        id: `gm_${Date.now()}`,
        groupId: newGroup.id,
        userId: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      };
      setGroupMembers((prev) => [...prev, ownerMember]);
    }

    showToast(
      language === 'vi'
        ? `Đã tạo nhóm học "${name}" thành công!`
        : `Created study group "${name}" successfully!`,
      'success'
    );
    return newGroup;
  };

  const joinStudyGroup = (inviteCode: string): boolean => {
    if (!currentUser) {
      openAuthModal('login');
      return false;
    }
    const grp = studyGroups.find((g) => g.inviteCode === inviteCode.trim().toUpperCase());
    if (!grp) {
      showToast(
        language === 'vi'
          ? 'Mã mời không đúng hoặc nhóm không tồn tại.'
          : 'Invalid invite code or group does not exist.',
        'error'
      );
      return false;
    }
    const isMember = groupMembers.some((m) => m.groupId === grp.id && m.userId === currentUser.id);
    if (isMember) {
      showToast(
        language === 'vi'
          ? 'Bạn đã là thành viên của nhóm này rồi!'
          : 'You are already a member of this group!',
        'info'
      );
      return true;
    }

    const newMember: GroupMember = {
      id: `gm_${Date.now()}`,
      groupId: grp.id,
      userId: currentUser.id,
      fullName: currentUser.fullName,
      email: currentUser.email,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };
    setGroupMembers((prev) => [...prev, newMember]);
    showToast(
      language === 'vi'
        ? `Chào mừng bạn gia nhập nhóm "${grp.name}"!`
        : `Welcome to study group "${grp.name}"!`,
      'success'
    );
    return true;
  };

  const leaveStudyGroup = (groupId: string) => {
    setGroupMembers((prev) =>
      prev.filter((m) => !(m.groupId === groupId && m.userId === currentUser?.id))
    );
    showToast(language === 'vi' ? 'Đã rời khỏi nhóm học.' : 'Left the study group.', 'info');
  };

  const deleteGroupMembers = (groupId: string) => {
    setGroupMembers((prev) => prev.filter((m) => m.groupId !== groupId));
  };

  const deleteGroupDeadlines = (groupId: string) => {
    setDeadlines((prev) => prev.filter((d) => d.groupId !== groupId));
  };

  const deleteGroupTasks = (_groupId: string) => {};

  const deleteStudyGroup = (groupId: string): boolean => {
    if (!currentUser) {
      showToast(
        language === 'vi'
          ? 'Vui lòng đăng nhập để thực hiện thao tác này.'
          : 'Please sign in to perform this action.',
        'error'
      );
      return false;
    }

    const grp = studyGroups.find((g) => g.id === groupId);
    if (!grp) {
      showToast(
        language === 'vi' ? 'Không tìm thấy nhóm học cần xóa.' : 'Study group not found.',
        'error'
      );
      return false;
    }

    const userMember = groupMembers.find(
      (m) => m.groupId === groupId && m.userId === currentUser.id
    );
    const isOwnerOrAdmin =
      grp.ownerId === currentUser.id ||
      userMember?.role === 'owner' ||
      userMember?.role === 'admin';

    if (!isOwnerOrAdmin) {
      showToast(
        language === 'vi'
          ? 'Bạn không có quyền xóa nhóm này.'
          : 'You do not have permission to delete this group.',
        'error'
      );
      return false;
    }

    deleteGroupMembers(groupId);
    deleteGroupDeadlines(groupId);
    deleteGroupTasks(groupId);

    setStudyGroups((prev) => prev.filter((g) => g.id !== groupId));
    showToast(
      language === 'vi'
        ? `Đã xóa nhóm học "${grp.name}" thành công!`
        : `Deleted study group "${grp.name}" successfully!`,
      'success'
    );
    return true;
  };

  // ====================================================================
  // Strict Real Authentication Logic (No Hardcoded Login, Backend Confirmed)
  // ====================================================================

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await apiLogin(email.trim(), pass);
      if (res && res.token && res.user) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
        setCurrentUser(res.user);
        closeAuthModal();

        // Check verification status
        if (!res.user.emailVerified && res.user.status === 'pending_verification') {
          setActiveTab('verify-email');
          showToast(
            language === 'vi'
              ? 'Vui lòng kiểm tra email để xác minh tài khoản của bạn.'
              : 'Please check your email to verify your account.',
            'warning'
          );
        } else {
          await loadUserWorkspace();
          setActiveTab('dashboard');
          showToast(
            language === 'vi'
              ? `Chào mừng trở lại, ${res.user.fullName}!`
              : `Welcome back, ${res.user.fullName}!`,
            'success'
          );
        }
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      const res = await apiRegister({
        ...userData,
        language: userData?.language || language,
      });
      if (res && (res.success || res.accountCreated)) {
        closeAuthModal();

        if (res.token && res.user) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
          setCurrentUser(res.user);
        }

        const emailSent = Boolean(res.verificationEmailSent ?? res.emailSent);
        const failUiMessage =
          translations[language]?.accountCreatedEmailFailedMsg ||
          (language === 'vi'
            ? 'Tài khoản đã được tạo nhưng email xác nhận chưa gửi được. Vui lòng cấu hình dịch vụ email hoặc thử gửi lại sau.'
            : 'Your account has been created, but the verification email could not be sent. Please configure the email service or try resending later.');

        try {
          sessionStorage.setItem(
            'studymind_last_email_delivery',
            JSON.stringify({
              email: res.user?.email || userData.email,
              accountCreated: true,
              verificationEmailSent: emailSent,
              emailSent,
              code: res.code,
              emailProvider: res.emailProvider,
              emailErrorCode: res.emailErrorCode || res.errorCode,
              verificationToken: res.verificationToken,
              verificationUrl: res.verificationUrl,
              emailPreviewUrl: res.emailPreviewUrl,
              message: emailSent ? res.message : failUiMessage,
              timestamp: Date.now(),
            })
          );
        } catch {}

        // Navigate to email verification screen
        setActiveTab('verify-email');
        if (emailSent) {
          showToast(
            res.message ||
              (language === 'vi'
                ? `Đã gửi email xác nhận đến ${res.user?.email || userData.email}. Vui lòng kiểm tra Inbox, Spam và Promotions.`
                : `Verification email sent to ${res.user?.email || userData.email}. Please check your Inbox, Spam, and Promotions.`),
            'success'
          );
        } else {
          showToast(failUiMessage, 'warning');
        }
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  const logout = () => {
    apiLogout().catch(() => {});
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setCurrentUser(null);
    setSubjects([]);
    setLessons([]);
    setDocuments([]);
    setDeadlines([]);
    setFlashcards([]);
    setQuizzes([]);
    setActiveTab('landing');
    showToast(
      language === 'vi' ? 'Đã đăng xuất tài khoản an toàn.' : 'Signed out safely.',
      'info'
    );
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await apiUpdateProfile(data);
      if (res && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
        showToast(
          language === 'vi'
            ? 'Đã cập nhật thông tin hồ sơ thành công!'
            : 'Profile updated successfully!',
          'success'
        );
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(
        err.message || (language === 'vi' ? 'Không thể cập nhật hồ sơ.' : 'Could not update profile.'),
        'error'
      );
      return false;
    }
  };

  const upgradeToPremium = () => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      plan: 'premium',
      planStatus: 'active',
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    setUpgradeModalOpen(false);
    showToast(
      language === 'vi'
        ? '🎉 Chúc mừng bạn đã sở hữu gói Mầm Study Premium!'
        : '🎉 Congratulations! You now have Mầm Study Premium!',
      'success'
    );
  };

  const downgradeToFree = () => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      plan: 'free',
      planStatus: 'active',
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    showToast(
      language === 'vi'
        ? 'Đã chuyển sang gói Free để kiểm thử giới hạn 4 môn học.'
        : 'Switched to Free plan to test the 4-course limit.',
      'info'
    );
  };

  const resetToDemoData = () => {
    const activeOwnerId = currentUser?.id || 'usr_demo_101';
    setSubjects(DEMO_SUBJECTS.map((s) => ({ ...s, ownerId: activeOwnerId })));
    setLessons(DEMO_LESSONS.map((l) => ({ ...l, ownerId: activeOwnerId })));
    setFlashcards(DEMO_FLASHCARDS.map((f) => ({ ...f, ownerId: activeOwnerId })));
    setQuizzes(DEMO_QUIZZES.map((q) => ({ ...q, ownerId: activeOwnerId })));
    setQuizAttempts([]);
    setDeadlines(DEMO_DEADLINES.map((d) => ({ ...d, ownerId: activeOwnerId })));
    setStudyGroups(DEMO_GROUPS);
    setGroupMembers(DEMO_GROUP_MEMBERS);
    setUsage(DEMO_USAGE);
    showToast(
      language === 'vi'
        ? 'Đã tải dữ liệu môn học & bài giảng mẫu để bạn trải nghiệm nhanh!'
        : 'Loaded sample courses & lectures for quick exploration!',
      'success'
    );
  };

  const incrementAiUsage = (count = 1) => {
    setUsage((prev) => ({
      ...prev,
      aiRequests: prev.aiRequests + count,
      updatedAt: new Date().toISOString(),
    }));
  };

  const incrementAudioUsage = (minutes = 1) => {
    setUsage((prev) => ({
      ...prev,
      audioMinutes: prev.audioMinutes + minutes,
      updatedAt: new Date().toISOString(),
    }));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        authLoading,
        subjects,
        lessons,
        flashcards,
        quizzes,
        quizAttempts,
        deadlines,
        studyGroups,
        groupMembers,
        documents,
        usage,
        theme,
        activeTab,
        activeSubjectId,
        activeLessonId,
        upgradeModalOpen,
        authModalOpen,
        authModalMode,
        onboardingOpen,
        toasts,
        language,
        setLanguage,
        toggleLanguage,
        t: translations[language],
        formatCurrency,
        formatLocalizedDate,
        setActiveTab,
        setActiveSubjectId,
        setActiveLessonId,
        setTheme,
        setUpgradeModalOpen,
        openAuthModal,
        closeAuthModal,
        setOnboardingOpen,
        showToast,
        removeToast,
        refreshUserData,
        addSubject,
        updateSubject,
        deleteSubject,
        deleteLessonsBySubject,
        deleteFlashcardsBySubject,
        deleteQuizzesBySubject,
        deleteDeadlinesBySubject,
        deleteDocumentsBySubject,
        deleteAudioFilesBySubject,
        addLesson,
        updateLesson,
        deleteLesson,
        deleteAudioFile,
        addFlashcards,
        updateFlashcard,
        deleteFlashcard,
        reviewFlashcard,
        addQuiz,
        deleteQuiz,
        deleteQuizQuestion,
        saveQuizAttempt,
        addDeadline,
        updateDeadline,
        deleteDeadline,
        toggleDeadlineChecklistItem,
        addDocument,
        updateDocument,
        deleteDocument,
        createStudyGroup,
        joinStudyGroup,
        leaveStudyGroup,
        deleteStudyGroup,
        deleteGroupMembers,
        deleteGroupDeadlines,
        deleteGroupTasks,
        login,
        register,
        logout,
        updateProfile,
        upgradeToPremium,
        downgradeToFree,
        resetToDemoData,
        incrementAiUsage,
        incrementAudioUsage,
      }}
    >
      <I18nProvider
        externalValue={{
          language,
          setLanguage,
          toggleLanguage,
          t: translations[language],
          formatCurrency,
          formatLocalizedDate,
        }}
      >
        {children}
      </I18nProvider>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
