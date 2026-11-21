import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  apiVerifyEmail,
  apiResendVerification,
  apiGetVerificationInfo,
  apiConfigureSmtp,
} from '../../services/api';
import {
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Send,
  GraduationCap,
  Inbox,
  Info,
  ShieldCheck,
  Settings,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface VerifyEmailPageProps {
  token?: string | null;
  onDone?: () => void;
}

type VerifyStatus =
  | 'verifying'
  | 'success'
  | 'already_used'
  | 'expired'
  | 'invalid'
  | 'pending_prompt';

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ token: propToken, onDone }) => {
  const {
    currentUser,
    isAuthenticated,
    openAuthModal,
    setActiveTab,
    showToast,
    refreshUserData,
    language,
    t,
  } = useApp();

  const [token, setToken] = useState<string | null>(() => {
    if (propToken) return propToken;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('token');
    }
    return null;
  });

  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [emailSentConfirmed, setEmailSentConfirmed] = useState<boolean | null>(null);
  const [deliveryFeedback, setDeliveryFeedback] = useState<string>('');

  // Pending verification token & preview state for instant verification
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingVerifyUrl, setPendingVerifyUrl] = useState<string | null>(null);
  const [emailHtmlPreview, setEmailHtmlPreview] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Optional runtime SMTP configuration state
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [savingSmtp, setSavingSmtp] = useState(false);

  // Load initial email delivery state from registration if present
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('studymind_last_email_delivery');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.emailSent === 'boolean') {
            setEmailSentConfirmed(parsed.emailSent);
          }
          if (parsed.message) {
            setDeliveryFeedback(parsed.message);
          }
          if (parsed.email && !customEmail) {
            setCustomEmail(parsed.email);
          }
          if (parsed.verificationToken) {
            setPendingToken(parsed.verificationToken);
          }
          if (parsed.verificationUrl) {
            setPendingVerifyUrl(parsed.verificationUrl);
          }
          if (parsed.emailSent) {
            setCooldown((prev) => (prev > 0 ? prev : 60));
          }
        }
      }
    } catch {}
  }, []);

  // Automatically fetch active verification info from backend when on pending_prompt
  useEffect(() => {
    if (token) return;
    let isMounted = true;
    const emailQuery = (currentUser?.email || customEmail).trim();

    apiGetVerificationInfo(emailQuery || undefined)
      .then((info) => {
        if (!isMounted || !info || !info.success) return;
        if (info.email && !customEmail) {
          setCustomEmail(info.email);
        }
        if (info.emailVerified) {
          setStatus('success');
          if (refreshUserData) {
            refreshUserData().catch(() => {});
          }
          return;
        }
        if (info.verificationToken) {
          setPendingToken(info.verificationToken);
          setEmailSentConfirmed(true);
        }
        if (info.verificationUrl) {
          setPendingVerifyUrl(info.verificationUrl);
        }
        if (info.emailHtml) {
          setEmailHtmlPreview(info.emailHtml);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [token, currentUser?.email, customEmail]);

  // Sync URL token if URL changes
  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, [token]);

  // Cooldown timer countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Verify token when present
  useEffect(() => {
    if (!token) {
      if (currentUser && currentUser.emailVerified) {
        setStatus('success');
      } else {
        setStatus('pending_prompt');
      }
      return;
    }

    let isMounted = true;
    const verify = async () => {
      setStatus('verifying');
      try {
        const res = await apiVerifyEmail(token, language);
        if (!isMounted) return;
        setStatus('success');
        setPendingToken(null);
        if (res.token) {
          localStorage.setItem('studymind_token', res.token);
        }
        if (res.user) {
          localStorage.setItem('studymind_user', JSON.stringify(res.user));
        }
        if (res.email && !customEmail) {
          setCustomEmail(res.email);
        }
        // Clear token from URL query so refreshing doesn't re-submit used token
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/verify-email');
        }
        try {
          sessionStorage.removeItem('studymind_last_email_delivery');
        } catch {}
        showToast(
          res.message ||
            (language === 'vi'
              ? 'Xác nhận email thành công!'
              : 'Email verified successfully!'),
          'success'
        );
        if (refreshUserData) {
          await refreshUserData();
        }
      } catch (err: any) {
        if (!isMounted) return;
        const code = err.errorCode || '';
        const msg = err.message || '';
        if (err.token) {
          localStorage.setItem('studymind_token', err.token);
        }
        if (err.user) {
          localStorage.setItem('studymind_user', JSON.stringify(err.user));
        }
        if (err.email && !customEmail) {
          setCustomEmail(err.email);
        }

        if (code === 'TOKEN_ALREADY_USED' || err.alreadyVerified) {
          setStatus('already_used');
          setErrorMessage(
            language === 'vi'
              ? 'Liên kết xác nhận này đã được sử dụng trước đó. Tài khoản của bạn đã được xác nhận email.'
              : 'This verification link has already been used. Your email address is already verified.'
          );
          if (refreshUserData) {
            refreshUserData().catch(() => {});
          }
        } else if (
          code === 'TOKEN_EXPIRED' ||
          msg.toLowerCase().includes('hết hạn') ||
          msg.toLowerCase().includes('expired')
        ) {
          setStatus('expired');
          setErrorMessage(
            language === 'vi'
              ? 'Liên kết xác nhận đã hết hạn (chỉ có hiệu lực trong 24 giờ). Vui lòng nhấn nút bên dưới để nhận email xác nhận mới.'
              : 'This verification link has expired (valid for 24 hours). Please click the button below to receive a new verification email.'
          );
        } else {
          setStatus('invalid');
          setErrorMessage(
            language === 'vi'
              ? 'Liên kết xác nhận không hợp lệ hoặc đã bị thay thế bởi email mới hơn. Vui lòng yêu cầu gửi lại email xác nhận.'
              : 'This verification link is invalid or has been replaced by a newer email. Please request a new verification email.'
          );
        }
      }
    };

    verify();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const targetEmail = currentUser?.email || customEmail.trim();

  const handleInstantVerify = () => {
    if (!pendingToken) return;
    setToken(pendingToken);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    const emailToUse = (currentUser?.email || customEmail).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailToUse || !emailRegex.test(emailToUse)) {
      showToast(
        language === 'vi'
          ? 'Vui lòng nhập địa chỉ email hợp lệ để gửi lại email xác nhận.'
          : 'Please enter a valid email address to resend the verification email.',
        'warning'
      );
      return;
    }

    setResending(true);
    try {
      const res = await apiResendVerification(emailToUse, language);
      setEmailSentConfirmed(true);
      setDeliveryFeedback(res.message);
      setCooldown(res.cooldownSeconds || 60);
      if (res.verificationToken) {
        setPendingToken(res.verificationToken);
      }
      if (res.verificationUrl) {
        setPendingVerifyUrl(res.verificationUrl);
      }
      if (typeof res.remainingAttempts === 'number') {
        setRemainingAttempts(res.remainingAttempts);
      }
      try {
        sessionStorage.setItem(
          'studymind_last_email_delivery',
          JSON.stringify({
            email: emailToUse,
            emailSent: true,
            verificationToken: res.verificationToken,
            verificationUrl: res.verificationUrl,
            message: res.message,
            timestamp: Date.now(),
          })
        );
      } catch {}

      // Refresh email HTML preview
      apiGetVerificationInfo(emailToUse)
        .then((info) => {
          if (info?.emailHtml) setEmailHtmlPreview(info.emailHtml);
        })
        .catch(() => {});

      if (status !== 'pending_prompt') {
        setToken(null);
        setStatus('pending_prompt');
      }

      showToast(
        res.message ||
          (language === 'vi'
            ? `Đã gửi lại email xác nhận đến ${emailToUse}!`
            : `Verification email resent to ${emailToUse}!`),
        'success'
      );
    } catch (err: any) {
      if (err.errorCode === 'ALREADY_VERIFIED' || err.alreadyVerified) {
        setStatus('already_used');
        showToast(
          language === 'vi'
            ? 'Tài khoản này đã được xác nhận email trước đó.'
            : 'This account has already been verified.',
          'info'
        );
        return;
      }

      if (err.verificationToken) {
        setPendingToken(err.verificationToken);
      }
      if (err.verificationUrl) {
        setPendingVerifyUrl(err.verificationUrl);
      }
      if (err.cooldownSeconds) {
        setCooldown(err.cooldownSeconds);
      }
      if (typeof err.remainingAttempts === 'number') {
        setRemainingAttempts(err.remainingAttempts);
      }

      if (err.errorCode !== 'RATE_LIMITED' && err.errorCode !== 'MAX_RESEND_EXCEEDED') {
        setEmailSentConfirmed(false);
        setDeliveryFeedback(err.message || '');
      }

      showToast(
        err.message ||
          (language === 'vi'
            ? 'Không thể gửi email xác nhận lúc này. Vui lòng thử lại sau.'
            : 'Could not send verification email right now. Please try again later.'),
        'error'
      );
    } finally {
      setResending(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpUser.trim() || !smtpPass.trim()) {
      showToast(
        language === 'vi'
          ? 'Vui lòng nhập địa chỉ Gmail và Mật khẩu ứng dụng (App Password 16 ký tự).'
          : 'Please enter your Gmail address and 16-character App Password.',
        'warning'
      );
      return;
    }

    setSavingSmtp(true);
    try {
      const res = await apiConfigureSmtp({
        host: smtpHost.trim() || 'smtp.gmail.com',
        port: parseInt(smtpPort || '587', 10) || 587,
        user: smtpUser.trim(),
        pass: smtpPass.trim(),
      });
      showToast(res.message, 'success');
      setShowSmtpConfig(false);
      setCooldown(0);
    } catch (err: any) {
      showToast(
        err.message ||
          (language === 'vi'
            ? 'Lưu cấu hình SMTP thất bại. Vui lòng kiểm tra lại App Password.'
            : 'Failed to save SMTP configuration. Please check your App Password.'),
        'error'
      );
    } finally {
      setSavingSmtp(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
        {/* Brand icon */}
        <div className="flex justify-center mb-6">
          <img
            src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
            alt="Mầm Study Logo"
            className="h-16 w-auto object-contain rounded-2xl"
          />
        </div>

        {/* 1. Verifying State */}
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {language === 'vi' ? 'Đang xác nhận email...' : 'Verifying your email...'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {language === 'vi'
                ? 'Hệ thống đang kiểm tra mã xác nhận và thời hạn liên kết của bạn. Vui lòng chờ giây lát.'
                : 'Checking your verification token and link expiration. Please wait a moment.'}
            </p>
          </div>
        )}

        {/* 2. Success State */}
        {status === 'success' && (
          <div className="space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Xác nhận email thành công!' : 'Email Verified Successfully!'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                {language === 'vi'
                  ? 'Địa chỉ email của bạn đã được xác nhận và tài khoản đã kích hoạt đầy đủ. Liên kết xác nhận đã được vô hiệu hóa để bảo mật.'
                  : 'Your email address has been verified and your account is now fully active. The single-use verification link has been invalidated for security.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  if (onDone) onDone();
                  if (isAuthenticated) {
                    setActiveTab('dashboard');
                  } else {
                    openAuthModal('login');
                    setActiveTab('landing');
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {isAuthenticated
                    ? language === 'vi'
                      ? 'Vào Bảng điều khiển'
                      : 'Go to Dashboard'
                    : language === 'vi'
                    ? 'Đăng nhập ngay'
                    : 'Sign In Now'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Already Used Token State */}
        {status === 'already_used' && (
          <div className="space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === 'vi'
                  ? 'Liên kết xác nhận đã được sử dụng'
                  : 'Verification Link Already Used'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                {errorMessage ||
                  (language === 'vi'
                    ? 'Liên kết xác nhận này chỉ được sử dụng một lần và tài khoản của bạn đã được xác nhận trước đó.'
                    : 'This verification link is single-use and your account has already been verified.')}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  if (onDone) onDone();
                  if (isAuthenticated) {
                    setActiveTab('dashboard');
                  } else {
                    openAuthModal('login');
                    setActiveTab('landing');
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {isAuthenticated
                    ? language === 'vi'
                      ? 'Tiếp tục vào ứng dụng'
                      : 'Continue to App'
                    : language === 'vi'
                    ? 'Đăng nhập tài khoản'
                    : 'Sign In to Your Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4. Expired Token State */}
        {status === 'expired' && (
          <div className="space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Liên kết xác nhận đã hết hạn' : 'Verification Link Expired'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {errorMessage ||
                  (language === 'vi'
                    ? 'Liên kết xác nhận email chỉ có hiệu lực trong 24 giờ. Hãy nhấn nút bên dưới để nhận liên kết xác nhận mới.'
                    : 'Email verification links are valid for 24 hours. Click the button below to receive a new verification link.')}
              </p>
            </div>

            {!currentUser && (
              <input
                type="email"
                placeholder={
                  language === 'vi' ? 'Nhập email đã đăng ký của bạn' : 'Enter your registered email'
                }
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'vi' ? 'Đang gửi email...' : 'Sending email...'}</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>
                    {language === 'vi'
                      ? `Gửi lại email xác nhận (${cooldown}s)`
                      : `Resend verification email (${cooldown}s)`}
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {language === 'vi'
                        ? 'Gửi lại email xác nhận'
                        : 'Resend Verification Email'}
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  openAuthModal('login');
                  setActiveTab('landing');
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                {language === 'vi' ? 'Quay lại đăng nhập' : 'Back to Sign In'}
              </button>
            </div>
          </div>
        )}

        {/* 5. Invalid Token State */}
        {status === 'invalid' && (
          <div className="space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === 'vi'
                  ? 'Liên kết xác nhận không hợp lệ'
                  : 'Invalid Verification Link'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {errorMessage ||
                  (language === 'vi'
                    ? 'Liên kết xác nhận không đúng hoặc đã hết hiệu lực. Bạn có thể yêu cầu gửi lại email xác nhận mới bên dưới.'
                    : 'The verification link is invalid or no longer active. You can request a new verification email below.')}
              </p>
            </div>

            {!currentUser && (
              <input
                type="email"
                placeholder={
                  language === 'vi'
                    ? 'Nhập email của bạn để nhận liên kết mới'
                    : 'Enter your email to receive a new link'
                }
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'vi' ? 'Đang gửi email...' : 'Sending email...'}</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>
                    {language === 'vi'
                      ? `Gửi lại email xác nhận (${cooldown}s)`
                      : `Resend verification email (${cooldown}s)`}
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {language === 'vi'
                        ? 'Gửi lại email xác nhận'
                        : 'Resend Verification Email'}
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  openAuthModal('login');
                  setActiveTab('landing');
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                {language === 'vi' ? 'Quay lại đăng nhập' : 'Back to Sign In'}
              </button>
            </div>
          </div>
        )}

        {/* 6. Pending Prompt State (User just registered or logged in with unverified account) */}
        {status === 'pending_prompt' && (
          <div className="space-y-5">
            {emailSentConfirmed === false && !pendingToken ? (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {language === 'vi'
                      ? 'Chưa gửi được email xác nhận'
                      : 'Verification Email Not Sent Yet'}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                    {language === 'vi'
                      ? 'Tài khoản đã được tạo cho địa chỉ:'
                      : 'Account created for email address:'}
                  </p>
                  <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {targetEmail || (language === 'vi' ? 'Chưa nhập email' : 'No email entered')}
                  </p>
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-3.5 text-left text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      {t.accountCreatedEmailFailedMsg ||
                        (language === 'vi'
                          ? 'Tài khoản đã được tạo nhưng email xác nhận chưa gửi được. Vui lòng cấu hình dịch vụ email hoặc thử gửi lại sau.'
                          : 'Your account has been created, but the verification email could not be sent. Please configure the email service or try resending later.')}
                    </p>
                    {deliveryFeedback &&
                      deliveryFeedback !== t.accountCreatedEmailFailedMsg && (
                        <p className="text-[11px] opacity-90">{deliveryFeedback}</p>
                      )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {language === 'vi' ? 'Xác nhận địa chỉ email của bạn' : 'Verify Your Email Address'}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                    {language === 'vi'
                      ? 'Email xác nhận tài khoản đã được gửi đến:'
                      : 'A verification email has been sent to:'}
                  </p>
                  <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1 break-all">
                    {targetEmail || (language === 'vi' ? 'email của bạn' : 'your email')}
                  </p>
                </div>

                {/* Instant One-Click Verification Card when pendingToken is available */}
                {pendingToken && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 text-left space-y-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                        <p className="font-bold text-sm">
                          {language === 'vi'
                            ? 'Liên kết xác nhận tài khoản đã sẵn sàng!'
                            : 'Your verification link is ready!'}
                        </p>
                        <p className="opacity-90">
                          {language === 'vi'
                            ? 'Bạn có thể nhấn nút bên dưới để xác nhận email và kích hoạt tài khoản ngay lập tức, hoặc mở xem nội dung email xác nhận.'
                            : 'Click the button below to verify your email and activate your account immediately, or preview the verification email.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleInstantVerify}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {language === 'vi'
                          ? 'Xác nhận email ngay (Kích hoạt trực tiếp)'
                          : 'Verify Email Now (Instant Activation)'}
                      </span>
                    </button>

                    {emailHtmlPreview && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowEmailPreview((prev) => !prev)}
                          className="w-full py-1.5 px-3 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            {showEmailPreview
                              ? language === 'vi'
                                ? 'Ẩn nội dung email xác nhận'
                                : 'Hide verification email preview'
                              : language === 'vi'
                              ? 'Xem nội dung email xác nhận đã gửi'
                              : 'Preview sent verification email'}
                          </span>
                        </button>

                        {showEmailPreview && (
                          <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto text-left">
                            <div
                              className="text-xs"
                              dangerouslySetInnerHTML={{ __html: emailHtmlPreview }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions to check Inbox, Spam, and Promotions */}
                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                    <Inbox className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>
                      {language === 'vi'
                        ? 'Hướng dẫn kiểm tra hộp thư:'
                        : 'Where to check for your email:'}
                    </span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      {language === 'vi' ? (
                        <>
                          Kiểm tra hộp thư đến chính (<strong>Inbox</strong>) và nhấn vào nút{' '}
                          <strong>"Xác nhận email"</strong>.
                        </>
                      ) : (
                        <>
                          Check your primary <strong>Inbox</strong> and click the{' '}
                          <strong>"Verify Email"</strong> button.
                        </>
                      )}
                    </li>
                    <li>
                      {language === 'vi' ? (
                        <>
                          Nếu chưa thấy sau 1–2 phút, vui lòng kiểm tra mục{' '}
                          <strong>Thư rác (Spam / Junk)</strong> và{' '}
                          <strong>Quảng cáo (Promotions)</strong>.
                        </>
                      ) : (
                        <>
                          If it doesn't appear within 1–2 minutes, please check your{' '}
                          <strong>Spam / Junk</strong> and <strong>Promotions</strong> folders.
                        </>
                      )}
                    </li>
                    <li>
                      {language === 'vi'
                        ? 'Liên kết xác nhận có hiệu lực trong 24 giờ và chỉ sử dụng được một lần.'
                        : 'The verification link is valid for 24 hours and can only be used once.'}
                    </li>
                  </ul>
                </div>
              </>
            )}

            {!currentUser && (
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'vi' ? 'Địa chỉ email nhận mã xác nhận' : 'Email address'}
                </label>
                <input
                  type="email"
                  placeholder={language === 'vi' ? 'Nhập email của bạn' : 'Enter your email'}
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            )}

            {remainingAttempts !== null && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {language === 'vi'
                    ? `Số lần gửi lại còn lại trong giờ này: ${remainingAttempts}`
                    : `Remaining resend attempts this hour: ${remainingAttempts}`}
                </span>
              </p>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'vi' ? 'Đang gửi email...' : 'Sending email...'}</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>
                    {language === 'vi'
                      ? `Gửi lại email xác nhận (${cooldown}s)`
                      : `Resend verification email (${cooldown}s)`}
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {t.resendVerificationBtn ||
                        (language === 'vi'
                          ? 'Gửi lại email xác nhận'
                          : 'Resend Verification Email')}
                    </span>
                  </>
                )}
              </button>

              {isAuthenticated && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  {language === 'vi' ? 'Vào trang tổng quan' : 'Go to Dashboard'}
                </button>
              )}
            </div>

            {/* Optional Collapsible Gmail SMTP Configuration */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-left">
              <button
                type="button"
                onClick={() => setShowSmtpConfig((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 py-1.5 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  <span>
                    {language === 'vi'
                      ? 'Cấu hình máy chủ Gmail SMTP để gửi tới hộp thư ngoài (Tùy chọn)'
                      : 'Configure Gmail SMTP for external inbox delivery (Optional)'}
                  </span>
                </span>
                {showSmtpConfig ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showSmtpConfig && (
                <form
                  onSubmit={handleSaveSmtp}
                  className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="text"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'vi' ? 'Email gửi (SMTP_USER)' : 'Sender Email (SMTP_USER)'}
                    </label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="your-email@gmail.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'vi'
                        ? 'Mật khẩu ứng dụng Gmail 16 ký tự (SMTP_PASSWORD)'
                        : '16-char Gmail App Password (SMTP_PASSWORD)'}
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50"
                  >
                    {savingSmtp
                      ? language === 'vi'
                        ? 'Đang kiểm tra kết nối SMTP...'
                        : 'Verifying SMTP connection...'
                      : language === 'vi'
                      ? 'Lưu & Kiểm tra kết nối SMTP'
                      : 'Save & Verify SMTP Connection'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


