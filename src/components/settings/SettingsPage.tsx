import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { safeConfirm } from '../../utils/formatters';
import { getAiStatus, testAiConnection, AiStatusResponse, apiUpdateLanguage } from '../../services/api';
import {
  User as UserIcon,
  Moon,
  Sun,
  Laptop,
  Bell,
  Bot,
  Database,
  Download,
  RotateCcw,
  Shield,
  Check,
  Crown,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
  Key,
  Cpu,
  HelpCircle,
  Globe,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    currentUser,
    updateProfile,
    theme,
    setTheme,
    resetToDemoData,
    showToast,
    subjects,
    lessons,
    flashcards,
    deadlines,
    language,
    setLanguage,
    t,
  } = useApp();
  const isEn = language === 'en';

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [school, setSchool] = useState(currentUser?.school || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [academicYear, setAcademicYear] = useState(currentUser?.academicYear || 'Năm 3');

  // Notification toggles
  const [remind1Day, setRemind1Day] = useState(true);
  const [remind3Days, setRemind3Days] = useState(true);
  const [aiNotifications, setAiNotifications] = useState(true);

  // Language settings (Requirement 5)
  const handleUpdateLanguage = (newLang: 'vi' | 'en') => {
    setLanguage(newLang, true);
  };

  // AI Diagnostics state (Section 9)
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [isLoadingAiStatus, setIsLoadingAiStatus] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sample?: string } | null>(null);
  const [showQuotaGuide, setShowQuotaGuide] = useState(false);

  useEffect(() => {
    loadAiStatus();
  }, []);

  const loadAiStatus = async () => {
    try {
      setIsLoadingAiStatus(true);
      const status = await getAiStatus();
      setAiStatus(status);
    } catch (e) {
      console.warn('Failed to load AI status:', e);
    } finally {
      setIsLoadingAiStatus(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingAi(true);
      setTestResult(null);
      const res = await testAiConnection();
      if (res.success) {
        setTestResult({
          success: true,
          message:
            res.message ||
            (isEn ? 'Gemini API connection successful!' : 'Kết nối Gemini API thành công!'),
          sample: res.responseSample,
        });
        showToast(
          isEn ? 'Gemini API connection successful!' : 'Kết nối Gemini API thành công!',
          'success'
        );
      } else {
        setTestResult({
          success: false,
          message:
            res.message ||
            (isEn ? 'Could not connect to Gemini API.' : 'Không thể kết nối đến Gemini API.'),
        });
        showToast(res.message || (isEn ? 'AI connection error' : 'Lỗi kết nối AI'), 'error');
      }
      await loadAiStatus();
    } catch (err: any) {
      const errMsg =
        err?.message || (isEn ? 'Error testing AI connection.' : 'Lỗi khi kiểm tra kết nối AI.');
      setTestResult({
        success: false,
        message: errMsg,
      });
      showToast(errMsg, 'error');
      await loadAiStatus();
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName: fullName.trim(),
      school: school.trim(),
      major: major.trim(),
      academicYear,
    });
  };

  const handleExportData = () => {
    const exportObject = {
      user: currentUser,
      exportDate: new Date().toISOString(),
      subjects,
      lessons,
      flashcards,
      deadlines,
    };

    const blob = new Blob([JSON.stringify(exportObject, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studymind-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      isEn
        ? 'Exported all personal data as JSON!'
        : 'Đã xuất toàn bộ dữ liệu cá nhân dạng JSON!',
      'success'
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {isEn ? 'System & Account Settings' : 'Cài đặt hệ thống & Tài khoản'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isEn
            ? 'Customize your student profile, appearance, notifications, and data exports.'
            : 'Tùy chỉnh hồ sơ sinh viên, giao diện hiển thị, thông báo và xuất dữ liệu.'}
        </p>
      </div>

      {/* 1. Profile Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
            <UserIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEn ? 'User Profile' : 'Hồ sơ người dùng'}
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Full Name' : 'Họ và tên'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Email Address' : 'Địa chỉ Email'}
              </label>
              <input
                type="text"
                disabled
                value={currentUser?.email || ''}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'University / College' : 'Trường Đại học / Cao đẳng'}
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Major' : 'Chuyên ngành'}
              </label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              {isEn ? 'Save Profile Changes' : 'Lưu thay đổi hồ sơ'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Theme Appearance */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
            <Sun className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEn ? 'Appearance & Theme' : 'Giao diện hiển thị'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sun className="w-5 h-5 mx-auto mb-1.5" />
            <span className="text-xs">{isEn ? 'Light Mode' : 'Chế độ sáng'}</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Moon className="w-5 h-5 mx-auto mb-1.5" />
            <span className="text-xs">{isEn ? 'Dark Mode' : 'Chế độ tối'}</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              theme === 'system'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Laptop className="w-5 h-5 mx-auto mb-1.5" />
            <span className="text-xs">{isEn ? 'System Default' : 'Theo hệ thống'}</span>
          </button>
        </div>
      </div>

      {/* Language Settings (Requirement 5) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.languageSettingTitle}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t.languageSettingDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleUpdateLanguage('vi')}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
              language === 'vi'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇻🇳</span>
              <div>
                <div className="text-xs font-bold">Tiếng Việt</div>
                <div className="text-[10px] text-slate-400">
                  {isEn ? 'Vietnamese interface (Default)' : 'Giao diện tiếng Việt (Mặc định)'}
                </div>
              </div>
            </div>
            {language === 'vi' && <Check className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            type="button"
            onClick={() => handleUpdateLanguage('en')}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
              language === 'en'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇬🇧</span>
              <div>
                <div className="text-xs font-bold">English</div>
                <div className="text-[10px] text-slate-400">International English</div>
              </div>
            </div>
            {language === 'en' && <Check className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </div>

      {/* 3. Notifications & Deadline alerts */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEn ? 'Deadline Reminders & Notifications' : 'Nhắc nhở Deadline & Thông báo'}
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isEn ? 'Remind me 1 day before a deadline' : 'Nhắc deadline trước 1 ngày đến hạn'}
            </span>
            <input
              type="checkbox"
              checked={remind1Day}
              onChange={(e) => setRemind1Day(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isEn ? 'Remind me 3 days before a deadline' : 'Nhắc deadline trước 3 ngày đến hạn'}
            </span>
            <input
              type="checkbox"
              checked={remind3Days}
              onChange={(e) => setRemind3Days(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isEn
                ? 'Notify me when AI finishes analyzing a lecture'
                : 'Thông báo khi AI hoàn tất phân tích bài giảng'}
            </span>
            <input
              type="checkbox"
              checked={aiNotifications}
              onChange={(e) => setAiNotifications(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>

      {/* 4. AI Diagnostics & Gemini API Status (Section 9) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEn ? 'AI & Gemini API Status' : 'Trạng thái AI & Gemini API'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  v2.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Monitor API key configuration, quota status, and Google Gemini model connectivity'
                  : 'Theo dõi tình trạng API key, hạn mức quota và kết nối mô hình Google Gemini'}
              </p>
            </div>
          </div>

          <button
            onClick={loadAiStatus}
            disabled={isLoadingAiStatus}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title={isEn ? 'Refresh status' : 'Làm mới trạng thái'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAiStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* AI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. API Key Status */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <Key className="w-3.5 h-3.5" />
              <span>{isEn ? 'API Key Config' : 'Cấu hình API Key'}</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              {aiStatus?.hasApiKey ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                    {aiStatus.maskedKey || 'AIza...••••'}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-rose-600 dark:text-rose-400">
                    {isEn ? 'Not configured' : 'Chưa cấu hình'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 2. Model */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <Cpu className="w-3.5 h-3.5" />
              <span>{isEn ? 'Active Model' : 'Mô hình sử dụng'}</span>
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate">
              {aiStatus?.model || 'gemini-3-flash-preview'}
            </div>
          </div>

          {/* 3. Quota Status */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEn ? 'Quota Status' : 'Trạng thái Quota'}</span>
            </div>
            <div className="font-bold">
              {aiStatus?.lastQuotaStatus === 'quota_exceeded' ? (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{isEn ? 'Daily Quota Exceeded (429)' : 'Hết hạn mức ngày (429)'}</span>
                </span>
              ) : aiStatus?.lastQuotaStatus === 'rate_limited' ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{isEn ? 'Temporary Rate Limit' : 'Giới hạn tốc độ tạm thời'}</span>
                </span>
              ) : aiStatus?.lastQuotaStatus === 'auth_error' ? (
                <span className="text-rose-600 dark:text-rose-400">
                  {isEn ? 'Key Auth Error' : 'Lỗi xác thực key'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{isEn ? 'Normal (Ready)' : 'Bình thường (Sẵn sàng)'}</span>
                </span>
              )}
            </div>
          </div>

          {/* 4. Last Request */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>{isEn ? 'Last Request' : 'Request gần nhất'}</span>
            </div>
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
              {aiStatus?.lastRequestAt
                ? new Date(aiStatus.lastRequestAt).toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : isEn
                ? 'No requests yet'
                : 'Chưa có yêu cầu'}
            </div>
          </div>
        </div>

        {/* Recent Error Warning Banner if any */}
        {aiStatus?.lastError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {isEn
                  ? 'Most recent Gemini API error recorded:'
                  : 'Ghi nhận lỗi từ Gemini API gần nhất:'}
              </span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed font-mono text-[11px] pl-6">
              {aiStatus.lastError}
            </p>
            {aiStatus.retryAfter && (
              <div className="pl-6 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                {isEn ? 'Estimated retry time: ' : 'Thời gian dự kiến có thể thử lại: '}
                {aiStatus.retryAfter}
              </div>
            )}
          </div>
        )}

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.sample && (
              <div className="text-[11px] pl-6 font-mono text-slate-600 dark:text-slate-300">
                {isEn ? 'Sample response: ' : 'Phản hồi mẫu: '} "{testResult.sample}"
              </div>
            )}
          </div>
        )}

        {/* Action Buttons & Guide Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTestingAi}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs"
            >
              {isTestingAi ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEn ? 'Pinging Gemini API...' : 'Đang ping Gemini API...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Test AI Connection' : 'Kiểm tra kết nối AI'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowQuotaGuide(!showQuotaGuide)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {showQuotaGuide
                  ? isEn
                    ? 'Hide Guide'
                    : 'Thu gọn hướng dẫn'
                  : isEn
                  ? 'Quota & Billing Guide'
                  : 'Hướng dẫn xử lý Quota & Billing'}
              </span>
            </button>
          </div>
        </div>

        {/* Quota & Billing Guide Accordion */}
        {showQuotaGuide && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>
                {isEn
                  ? 'Quota Policy & Resolving 429 RESOURCE_EXHAUSTED Errors'
                  : 'Chính sách hạn mức và cách khắc phục lỗi 429 RESOURCE_EXHAUSTED'}
              </span>
            </div>
            <ul className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed list-disc pl-5">
              <li>
                <strong className="text-slate-900 dark:text-white">
                  {isEn ? 'Data Preservation:' : 'Bảo toàn dữ liệu:'}
                </strong>{' '}
                {isEn
                  ? 'When a 429 AI quota error occurs, your document files and lecture recordings are already safely stored on the server. You do not need to re-upload them.'
                  : 'Khi gặp lỗi quota AI 429, file tài liệu và bản ghi âm bài giảng của bạn đã được lưu trữ an toàn trên máy chủ. Bạn không cần tải lại file.'}
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">
                  {isEn ? 'Free Tier Limits:' : 'Cơ chế Hạn mức Miễn phí:'}
                </strong>{' '}
                {isEn
                  ? 'Google AI Studio Free Tier enforces requests-per-day (RPD) and requests-per-minute (RPM) limits. Exceeding them returns HTTP 429 RESOURCE_EXHAUSTED.'
                  : 'Gói Free Tier của Google AI Studio có giới hạn số lượng yêu cầu mỗi ngày (RPD) và mỗi phút (RPM). Khi vượt quá, hệ thống sẽ trả về lỗi HTTP 429 RESOURCE_EXHAUSTED.'}
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">
                  {isEn ? 'Reset Schedule:' : 'Thời gian cấp lại:'}
                </strong>{' '}
                {isEn
                  ? 'Daily quotas typically reset at 00:00 PST (around 14:00 - 15:00 Vietnam time).'
                  : 'Quota hàng ngày thường được hệ thống Google reset vào 00:00 PST (khoảng 14:00 - 15:00 giờ Việt Nam).'}
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">
                  {isEn ? 'Enable Billing for Higher Limits:' : 'Kích hoạt Billing để dùng không giới hạn:'}
                </strong>{' '}
                {isEn
                  ? 'For heavy exam or thesis workloads, you can link a Pay-as-you-go billing account in Google Cloud Console or AI Studio to unlock higher rate limits.'
                  : 'Nếu cần sử dụng tần suất cao cho kỳ thi hoặc luận văn, bạn có thể liên kết thẻ thanh toán (Pay-as-you-go) cho Project tại Google Cloud Console hoặc AI Studio để mở khóa hạn mức cao hơn.'}
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 4. Data Management */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEn ? 'Data Management & Demo Reset' : 'Quản lý dữ liệu & Khôi phục mẫu'}
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleExportData}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>
              {isEn ? 'Export All Personal Data (JSON)' : 'Xuất toàn bộ dữ liệu cá nhân (JSON)'}
            </span>
          </button>

          <button
            onClick={() => {
              if (
                safeConfirm(
                  isEn
                    ? 'Restore all sample lectures, subjects, and deadlines?'
                    : 'Khôi phục toàn bộ bài giảng, môn học và deadline mẫu ban đầu?'
                )
              ) {
                resetToDemoData();
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100"
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {isEn
                ? 'Restore Default Sample Study Data'
                : 'Khôi phục dữ liệu bài học mẫu ban đầu'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
