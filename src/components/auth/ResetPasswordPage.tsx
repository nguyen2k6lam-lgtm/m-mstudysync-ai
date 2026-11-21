import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiResetPassword } from '../../services/api';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

interface ResetPasswordPageProps {
  token?: string | null;
  onSuccess?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token: propToken, onSuccess }) => {
  const { openAuthModal, setActiveTab, showToast, language } = useApp();

  const [token, setToken] = useState<string | null>(propToken || null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, [token]);

  // Password validation rules
  const hasMinLen = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(
        language === 'vi'
          ? 'Thiếu mã khôi phục mật khẩu. Vui lòng sử dụng liên kết trong email.'
          : 'Missing password reset token. Please use the link from your email.'
      );
      return;
    }

    if (!hasMinLen || !hasLetter || !hasNumber) {
      setError(
        language === 'vi'
          ? 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số.'
          : 'New password must be at least 8 characters and include both letters and numbers.'
      );
      return;
    }

    if (!isMatch) {
      setError(
        language === 'vi'
          ? 'Mật khẩu xác nhận không trùng khớp.'
          : 'Confirmation password does not match.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await apiResetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      setSuccess(true);
      showToast(
        res.message ||
          (language === 'vi'
            ? 'Mật khẩu đã được cập nhật thành công!'
            : 'Password updated successfully!'),
        'success'
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(
        err.message ||
          (language === 'vi'
            ? 'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.'
            : 'Could not reset password. The link may have expired.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Brand Icon */}
        <div className="flex justify-center mb-5">
          <img
            src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
            alt="Mầm Study Logo"
            className="h-14 w-auto object-contain rounded-2xl"
          />
        </div>

        {success ? (
          <div className="text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {language === 'vi'
                  ? 'Đặt lại mật khẩu thành công!'
                  : 'Password Reset Successfully!'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                {language === 'vi'
                  ? 'Mật khẩu mới của bạn đã có hiệu lực ngay bây giờ. Hãy đăng nhập để tiếp tục học tập cùng Mầm Study.'
                  : 'Your new password is now active. Please sign in to continue learning with Mầm Study.'}
              </p>
            </div>
            <button
              onClick={() => {
                openAuthModal('login');
                setActiveTab('dashboard');
              }}
              className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{language === 'vi' ? 'Đăng nhập ngay' : 'Sign In Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'vi'
                  ? 'Tạo mật khẩu an toàn mới cho tài khoản Mầm Study của bạn.'
                  : 'Create a strong new password for your Mầm Study account.'}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'vi' ? 'Mật khẩu mới' : 'New Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={
                      language === 'vi'
                        ? 'Tối thiểu 8 ký tự (chữ và số)'
                        : 'Min 8 characters (letters & numbers)'
                    }
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={
                      language === 'vi' ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'
                    }
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasMinLen ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    ✓
                  </div>
                  <span className={hasMinLen ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    {language === 'vi' ? 'Tối thiểu 8 ký tự' : 'At least 8 characters'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasLetter && hasNumber ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    ✓
                  </div>
                  <span className={hasLetter && hasNumber ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    {language === 'vi' ? 'Bao gồm cả chữ cái và số' : 'Includes both letters and numbers'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${isMatch ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    ✓
                  </div>
                  <span className={isMatch ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    {language === 'vi' ? 'Hai mật khẩu trùng khớp' : 'Both passwords match'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !hasMinLen || !hasLetter || !hasNumber || !isMatch}
                className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'vi' ? 'Đang cập nhật...' : 'Updating...'}</span>
                  </>
                ) : (
                  <span>{language === 'vi' ? 'Lưu mật khẩu mới' : 'Save New Password'}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
