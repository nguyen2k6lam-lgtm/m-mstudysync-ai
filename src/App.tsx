import React, { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/Toast';
import { UpgradeModal } from './components/common/UpgradeModal';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { apiResendVerification } from './services/api';

// Pages
import { LandingPage } from './components/landing/LandingPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { SubjectList } from './components/subjects/SubjectList';
import { SubjectDetail } from './components/subjects/SubjectDetail';
import { LectureRecorder } from './components/recorder/LectureRecorder';
import { DocumentUploader } from './components/documents/DocumentUploader';
import { FlashcardDeck } from './components/flashcards/FlashcardDeck';
import { QuizPlayer } from './components/quiz/QuizPlayer';
import { DeadlineManager } from './components/deadlines/DeadlineManager';
import { StudyGroupView } from './components/groups/StudyGroupView';
import { AiTutorChat } from './components/chat/AiTutorChat';
import { PricingPage } from './components/premium/PricingPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { AudioDebugger } from './components/debug/AudioDebugger';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { PaymentSuccessPage } from './components/checkout/PaymentSuccessPage';
import { PaymentFailedPage } from './components/checkout/PaymentFailedPage';
import { TransactionHistoryPage } from './components/billing/TransactionHistoryPage';
import { UserProfilePage } from './components/profile/UserProfilePage';
import { VerifyEmailPage } from './components/auth/VerifyEmailPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';

import { AlertTriangle, Send, RefreshCw } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, currentUser, activeTab, setActiveTab, showToast, t, language } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Parse URL pathname and query params cleanly into routes (Requirement 1)
  const parseCurrentRoute = useCallback(() => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    const orderIdParam = searchParams.get('orderId') || searchParams.get('id');

    // Extract path-based order ID for /checkout/:orderId
    let pathOrderId: string | null = null;
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'checkout' && pathParts[1]) {
      pathOrderId = pathParts[1];
    } else if (pathParts[0] === 'payment' && pathParts[1] === 'success' && pathParts[2]) {
      pathOrderId = pathParts[2];
    } else if (pathParts[0] === 'payment' && pathParts[1] === 'failed' && pathParts[2]) {
      pathOrderId = pathParts[2];
    }

    const resolvedOrderId = orderIdParam || pathOrderId;
    if (resolvedOrderId) {
      setCurrentOrderId(resolvedOrderId);
    }

    // Match routes
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (pathname.startsWith('/checkout')) {
      setActiveTab('checkout');
    } else if (pathname === '/premium') {
      setActiveTab('premium');
    } else if (pathname.startsWith('/payment/success')) {
      setActiveTab('payment-success');
    } else if (pathname.startsWith('/payment/failed')) {
      setActiveTab('payment-failed');
    } else if (
      pathname.startsWith('/payment/history') ||
      pathname === '/transactions' ||
      pathname === '/billing'
    ) {
      setActiveTab('transactions');
    } else if (pathname === '/profile') {
      setActiveTab('profile');
    } else if (pathname.startsWith('/verify-email')) {
      setActiveTab('verify-email');
    } else if (pathname.startsWith('/reset-password')) {
      setActiveTab('reset-password');
    } else if (pathname.startsWith('/debug/audio')) {
      setActiveTab('debug-audio');
    }
  }, [setActiveTab]);

  // Sync initial route and listen to browser popstate (back/forward navigation)
  useEffect(() => {
    parseCurrentRoute();

    const handlePopState = () => {
      parseCurrentRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [parseCurrentRoute]);

  // Sync URL when activeTab changes internally
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (activeTab === 'debug-audio') {
      window.history.replaceState(null, '', '/debug/audio');
    } else if (activeTab === 'premium') {
      window.history.replaceState(null, '', '/premium');
    } else if (activeTab === 'transactions') {
      window.history.replaceState(null, '', '/payment/history');
    } else if (activeTab === 'profile') {
      window.history.replaceState(null, '', '/profile');
    } else if (activeTab === 'checkout') {
      if (currentOrderId && !window.location.pathname.startsWith('/checkout')) {
        window.history.replaceState(null, '', `/checkout/${currentOrderId}`);
      }
    } else if (activeTab === 'payment-success') {
      if (currentOrderId) {
        window.history.replaceState(null, '', `/payment/success?orderId=${currentOrderId}`);
      } else {
        window.history.replaceState(null, '', '/payment/success');
      }
    } else if (activeTab === 'payment-failed') {
      if (currentOrderId) {
        window.history.replaceState(null, '', `/payment/failed?orderId=${currentOrderId}`);
      } else {
        window.history.replaceState(null, '', '/payment/failed');
      }
    } else if (activeTab === 'dashboard') {
      if (window.location.pathname !== '/' && !window.location.pathname.includes('/dashboard')) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [activeTab, currentOrderId]);

  const handleResendVerificationFromBanner = async () => {
    if (!currentUser || resendingVerification) return;
    setResendingVerification(true);
    try {
      const res = await apiResendVerification();
      showToast(res.message || t.verificationSentMsg, 'success');
    } catch (err: any) {
      showToast(err.message || t.verificationErrorMsg, 'error');
    } finally {
      setResendingVerification(false);
    }
  };

  // If user explicitly logged out or wants landing page
  if (!isAuthenticated && activeTab === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
        <LandingPage />
        <AuthModal />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Unverified Email Warning Banner */}
      {isAuthenticated && currentUser && !currentUser.emailVerified && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>{t.emailNotVerifiedBanner}</strong>{' '}
                <strong className="underline">{currentUser.email}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResendVerificationFromBanner}
                disabled={resendingVerification}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
              >
                {resendingVerification ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>{t.resendVerificationBtn}</span>
              </button>
              <button
                onClick={() => setActiveTab('verify-email')}
                className="px-2.5 py-1 rounded-lg border border-amber-600 text-amber-800 dark:text-amber-300 font-bold text-[11px] hover:bg-amber-500/20 transition-colors"
              >
                {t.verifyEmailTitle}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body Area with Sidebar and Main Content */}
      <div className="flex-1 flex w-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          {activeTab === 'landing' && <LandingPage />}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'subjects' && <SubjectList />}
          {activeTab === 'subject-detail' && <SubjectDetail />}
          {activeTab === 'recorder' && <LectureRecorder />}
          {activeTab === 'debug-audio' && <AudioDebugger />}
          {activeTab === 'documents' && <DocumentUploader />}
          {activeTab === 'flashcards' && <FlashcardDeck />}
          {activeTab === 'quizzes' && <QuizPlayer />}
          {activeTab === 'deadlines' && <DeadlineManager />}
          {activeTab === 'groups' && <StudyGroupView />}
          {activeTab === 'ai-chat' && <AiTutorChat />}
          {activeTab === 'premium' && <PricingPage />}
          {activeTab === 'checkout' && <CheckoutPage orderId={currentOrderId} />}
          {activeTab === 'payment-success' && <PaymentSuccessPage orderId={currentOrderId} />}
          {activeTab === 'payment-failed' && <PaymentFailedPage orderId={currentOrderId} />}
          {activeTab === 'transactions' && <TransactionHistoryPage />}
          {activeTab === 'profile' && <UserProfilePage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'verify-email' && <VerifyEmailPage />}
          {activeTab === 'reset-password' && <ResetPasswordPage />}
        </main>
      </div>

      {/* Modals & Overlays */}
      <UpgradeModal />
      <AuthModal />
      <OnboardingModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
