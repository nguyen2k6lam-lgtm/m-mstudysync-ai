import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { apiForgotPassword, apiResendVerification } from '../../services/api';
import {
  Mail,
  Lock,
  User as UserIcon,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  GraduationCap,
  Send,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authModalMode, closeAuthModal, openAuthModal, login, register, showToast, t, language } = useApp();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [academicYear, setAcademicYear] = useState('Năm 2');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResendUnverified, setCanResendUnverified] = useState(false);
  const [resendingUnverified, setResendingUnverified] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    setError(null);
    setCanResendUnverified(false);
    setResendingUnverified(false);
    setResetSent(false);
    setLoading(false);
  }, [authModalOpen, authModalMode]);

  const handleResendForUnverified = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendingUnverified) return;
    setResendingUnverified(true);
    try {
      const res = await apiResendVerification(cleanEmail, language);
      showToast(
        res.message ||
          (language === 'vi'
            ? `Đã gửi lại email xác nhận đến ${cleanEmail}.`
            : `Verification email resent to ${cleanEmail}.`),
        'success'
      );
      setError(null);
      setCanResendUnverified(false);
    } catch (err: any) {
      setError(
        err.message ||
          t.accountCreatedEmailFailedMsg ||
          (language === 'vi'
            ? 'Tài khoản đã được tạo nhưng email xác nhận chưa gửi được. Vui lòng cấu hình dịch vụ email hoặc thử gửi lại sau.'
            : 'Your account has been created, but the verification email could not be sent. Please configure the email service or try resending later.')
      );
      showToast(
        err.message ||
          t.accountCreatedEmailFailedMsg ||
          (language === 'vi'
            ? 'Không thể gửi lại email xác nhận lúc này.'
            : 'Could not resend verification email right now.'),
        'error'
      );
    } finally {
      setResendingUnverified(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCanResendUnverified(false);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError(language === 'vi' ? 'Vui lòng nhập địa chỉ email hợp lệ.' : 'Please enter a valid email address.');
      return;
    }

    if (authModalMode === 'login') {
      if (!password) {
        setError(language === 'vi' ? 'Vui lòng nhập mật khẩu.' : 'Please enter your password.');
        return;
      }

      setLoading(true);
      try {
        const success = await login(email.trim(), password);
        if (!success) {
          setError(language === 'vi' ? 'Email hoặc mật khẩu không chính xác.' : 'Invalid email or password.');
        }
      } catch (err: any) {
        setError(err.message || (language === 'vi' ? 'Email hoặc mật khẩu không chính xác.' : 'Invalid email or password.'));
      } finally {
        setLoading(false);
      }
    } else if (authModalMode === 'register') {
      if (!fullName.trim()) {
        setError(language === 'vi' ? 'Vui lòng nhập họ và tên của bạn.' : 'Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setError(language === 'vi' ? 'Mật khẩu phải chứa ít nhất 8 ký tự.' : 'Password must be at least 8 characters long.');
        return;
      }
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasDigit = /[0-9]/.test(password);
      if (!hasLetter || !hasDigit) {
        setError(language === 'vi' ? 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.' : 'Password must contain at least one letter and one number.');
        return;
      }
      if (password !== confirmPassword) {
        setError(language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
        return;
      }
      if (!agreeTerms) {
        setError(language === 'vi' ? 'Vui lòng chấp nhận điều khoản sử dụng để tiếp tục.' : 'Please agree to the Terms of Service to continue.');
        return;
      }

      setLoading(true);
      try {
        const success = await register({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          school: school.trim(),
          major: major.trim(),
          academicYear,
          agreeTerms,
          language,
        });

        if (!success) {
          setError(language === 'vi' ? 'Không thể tạo tài khoản. Vui lòng thử lại.' : 'Could not create account. Please try again.');
        }
      } catch (err: any) {
        if (err.canResendVerification || err.code === 'EMAIL_ALREADY_EXISTS_UNVERIFIED') {
          setCanResendUnverified(true);
        }
        setError(err.message || (language === 'vi' ? 'Không thể tạo tài khoản. Vui lòng thử lại.' : 'Could not create account. Please try again.'));
      } finally {
        setLoading(false);
      }
    } else if (authModalMode === 'forgot') {
      setLoading(true);
      try {
        const res = await apiForgotPassword(email.trim());
        setResetSent(true);
        showToast(res.message || (language === 'vi' ? 'Đã gửi hướng dẫn khôi phục mật khẩu!' : 'Password reset instructions sent!'), 'success');
      } catch (err: any) {
        setError(err.message || (language === 'vi' ? 'Không thể gửi email lúc này. Vui lòng thử lại.' : 'Could not send email at this time. Please try again.'));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={authModalOpen}
      onClose={closeAuthModal}
      maxWidth="md"
    >
      <div className="pt-2">
        {/* Header Icon */}
        <div className="flex justify-center mb-4">
          <img
            src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
            alt="Mầm Study Logo"
            className="h-14 w-auto object-contain rounded-xl"
          />
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {authModalMode === 'login' && t.authModalTitleLogin}
            {authModalMode === 'register' && t.authModalTitleRegister}
            {authModalMode === 'forgot' && t.authModalTitleForgot}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {authModalMode === 'login' && (language === 'vi' ? 'Nhập email và mật khẩu của bạn để tiếp tục.' : 'Enter your email and password to continue.')}
            {authModalMode === 'register' && (language === 'vi' ? 'Bắt đầu với 4 môn học miễn phí và 300 phút ghi âm.' : 'Start with 4 free courses and 300 minutes of recording.')}
            {authModalMode === 'forgot' && (language === 'vi' ? 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.' : 'Enter your registered email to receive password reset link.')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {canResendUnverified && (
              <button
                type="button"
                onClick={handleResendForUnverified}
                disabled={resendingUnverified}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {resendingUnverified ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'vi' ? 'Đang gửi email...' : 'Sending email...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.resendVerificationBtn || (language === 'vi' ? 'Gửi lại email xác nhận' : 'Resend Verification Email')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {authModalMode === 'forgot' && resetSent ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'vi' ? 'Hướng dẫn đã được gửi!' : 'Instructions Sent!'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {language === 'vi' ? (
                <>
                  Nếu email đã được đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư đến của bạn.
                </>
              ) : (
                <>
                  If the email is registered, instructions have been sent to <strong>{email}</strong>. Please check your inbox.
                </>
              )}
            </p>
            <button
              onClick={() => {
                setResetSent(false);
                openAuthModal('login');
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors"
            >
              {language === 'vi' ? 'Quay lại đăng nhập' : 'Back to Login'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {authModalMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.fullNameLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={language === 'vi' ? 'Ví dụ: Nguyễn Văn Minh' : 'e.g., Alex Johnson'}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.emailLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {authModalMode !== 'forgot' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.passwordLabel}{' '}
                  {authModalMode === 'register' && (
                    <span className="text-slate-400 font-normal">({t.passwordPlaceholder})</span>
                  )}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {authModalMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.confirmPasswordLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.schoolLabel} ({language === 'vi' ? 'tùy chọn' : 'optional'})
                    </label>
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder={language === 'vi' ? 'ĐH Bách Khoa, ĐHQG...' : 'University / College...'}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.majorLabel} ({language === 'vi' ? 'tùy chọn' : 'optional'})
                    </label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder={language === 'vi' ? 'Công nghệ Thông tin...' : 'Computer Science...'}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.academicYearLabel} ({language === 'vi' ? 'tùy chọn' : 'optional'})
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Năm 1">{language === 'vi' ? 'Sinh viên Năm 1' : 'Freshman (Year 1)'}</option>
                    <option value="Năm 2">{language === 'vi' ? 'Sinh viên Năm 2' : 'Sophomore (Year 2)'}</option>
                    <option value="Năm 3">{language === 'vi' ? 'Sinh viên Năm 3' : 'Junior (Year 3)'}</option>
                    <option value="Năm 4">{language === 'vi' ? 'Sinh viên Năm 4' : 'Senior (Year 4)'}</option>
                    <option value="Sau đại học">{language === 'vi' ? 'Cao học / Khác' : 'Postgraduate / Other'}</option>
                  </select>
                </div>

                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {t.agreeTermsText}
                  </span>
                </label>
              </>
            )}

            {authModalMode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-600 dark:text-slate-400">
                    {language === 'vi' ? 'Ghi nhớ đăng nhập' : 'Remember me'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => openAuthModal('forgot')}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t.forgotPasswordLink}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {authModalMode === 'login' && (language === 'vi' ? 'Đang đăng nhập...' : 'Logging in...')}
                    {authModalMode === 'register' && (language === 'vi' ? 'Đang tạo tài khoản...' : 'Creating account...')}
                    {authModalMode === 'forgot' && (language === 'vi' ? 'Đang gửi email...' : 'Sending email...')}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {authModalMode === 'login' && t.loginButton}
                    {authModalMode === 'register' && t.registerButton}
                    {authModalMode === 'forgot' && (language === 'vi' ? 'Gửi email khôi phục' : 'Send Reset Link')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch mode links */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              {authModalMode === 'login' ? (
                <span>
                  {t.noAccountText}{' '}
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                  >
                    {t.register}
                  </button>
                </span>
              ) : (
                <span>
                  {t.hasAccountText}{' '}
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                  >
                    {t.login}
                  </button>
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
