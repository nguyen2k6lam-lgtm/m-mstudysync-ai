import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  apiUploadAvatar,
  apiDeleteAvatar,
  apiGetProfile,
} from '../../services/api';
import { isPremium } from '../../utils/planLimits';
import {
  User as UserIcon,
  Mail,
  School,
  GraduationCap,
  Calendar,
  Clock,
  Bell,
  Camera,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Crown,
  BookOpen,
  FileText,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile, showToast, setActiveTab, setUpgradeModalOpen } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [school, setSchool] = useState(currentUser?.school || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [academicYear, setAcademicYear] = useState(currentUser?.academicYear || 'Năm 2');
  const [timezone, setTimezone] = useState(currentUser?.timezone || 'Asia/Ho_Chi_Minh');

  // Notifications
  const [remind1Day, setRemind1Day] = useState(true);
  const [remind3Days, setRemind3Days] = useState(true);
  const [aiNotifications, setAiNotifications] = useState(true);

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<{ subjectsCount: number; lessonsCount: number; documentsCount: number }>({
    subjectsCount: 0,
    lessonsCount: 0,
    documentsCount: 0,
  });

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setSchool(currentUser.school || '');
      setMajor(currentUser.major || '');
      setAcademicYear(currentUser.academicYear || 'Năm 2');
      setTimezone(currentUser.timezone || 'Asia/Ho_Chi_Minh');
    }

    // Load server stats
    apiGetProfile()
      .then((data) => {
        setStats({
          subjectsCount: data.subjectsCount || 0,
          lessonsCount: data.lessonsCount || 0,
          documentsCount: data.documentsCount || 0,
        });
      })
      .catch(() => {});
  }, [currentUser]);

  const premium = isPremium(currentUser);

  // Initial avatar letter
  const getInitials = (name?: string) => {
    if (!name) return 'SV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Kích thước ảnh đại diện không được vượt quá 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setAvatarError('Chỉ chấp nhận các định dạng ảnh: JPG, JPEG, PNG, WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  // Cancel new avatar preview
  const handleCancelPreview = () => {
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    setSelectedFile(null);
    setAvatarError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save selected avatar
  const handleSaveAvatar = async () => {
    if (!selectedFile) return;
    setAvatarLoading(true);
    setAvatarError(null);

    try {
      const res = await apiUploadAvatar(selectedFile);
      if (res.success) {
        showToast('Ảnh đại diện đã được cập nhật thành công.', 'success');
        handleCancelPreview();
        // Update local user state
        if (currentUser) {
          updateProfile({ avatarUrl: res.avatarUrl });
        }
      }
    } catch (err: any) {
      setAvatarError(err.message || 'Không thể tải lên ảnh đại diện.');
      showToast(err.message || 'Lỗi khi lưu ảnh đại diện.', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  // Delete current avatar
  const handleDeleteAvatar = async () => {
    if (!currentUser?.avatarUrl) return;
    setAvatarLoading(true);
    setAvatarError(null);

    try {
      const res = await apiDeleteAvatar();
      if (res.success) {
        showToast('Đã xóa ảnh đại diện thành công.', 'info');
        handleCancelPreview();
        if (currentUser) {
          updateProfile({ avatarUrl: undefined });
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa ảnh đại diện.', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Họ và tên không được để trống.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateProfile({
        fullName: fullName.trim(),
        school: school.trim(),
        major: major.trim(),
        academicYear,
        timezone,
        language: 'vi',
      });

      if (success) {
        // Success notification is handled inside updateProfile or here
      }
    } catch (err: any) {
      showToast(err.message || 'Cập nhật hồ sơ thất bại. Dữ liệu cũ được giữ nguyên.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const displayAvatar = avatarPreview || currentUser?.avatarUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Hồ sơ cá nhân & Tài khoản</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentUser?.fullName || 'Sinh viên StudySync AI'}
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-lg">
              Quản lý thông tin học tập, gói dịch vụ và cài đặt thông báo của bạn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {premium ? (
              <div className="px-4 py-2 rounded-2xl bg-amber-400 text-slate-900 font-extrabold text-xs flex items-center gap-2 shadow-lg">
                <Crown className="w-4 h-4 text-amber-700" />
                <span>Gói Premium VIP</span>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('checkout')}
                className="px-4 py-2 rounded-2xl bg-white text-indigo-700 font-bold text-xs hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Nâng cấp Premium</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Môn học</span>
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.subjectsCount}
            <span className="text-xs font-normal text-slate-400 ml-1">
              {premium ? 'môn (Không giới hạn)' : '/ 4 môn'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Bài giảng</span>
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.lessonsCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Tài liệu</span>
            <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.documentsCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Ngày tham gia</span>
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {currentUser?.createdAt
              ? new Date(currentUser.createdAt).toLocaleDateString('vi-VN')
              : 'Gần đây'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Account Status */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Ảnh đại diện
            </h3>

            {/* Avatar Circle */}
            <div className="relative inline-block mx-auto mb-4">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={currentUser?.fullName}
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-indigo-100 dark:ring-indigo-950/60 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-linear-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-3xl flex items-center justify-center ring-4 ring-indigo-100 dark:ring-indigo-950/60 shadow-lg">
                  {getInitials(currentUser?.fullName)}
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Change button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute bottom-1 right-1 p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
                title="Thay đổi ảnh"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {avatarError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{avatarError}</span>
              </div>
            )}

            {/* Action buttons if file selected */}
            {selectedFile ? (
              <div className="space-y-2 mt-2">
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={handleSaveAvatar}
                    disabled={avatarLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {avatarLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Lưu ảnh mới</span>
                  </button>
                  <button
                    onClick={handleCancelPreview}
                    disabled={avatarLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hủy</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Chọn ảnh mới
                </button>
                {currentUser?.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={avatarLoading}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Xóa ảnh và dùng avatar mặc định"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-4 leading-normal">
              Định dạng cho phép: JPG, PNG, WEBP. Dung lượng tối đa: 5MB.
            </p>
          </div>

          {/* Plan Summary Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Gói tài khoản
              </span>
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${premium ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                {premium ? 'Premium' : 'Free (Miễn phí)'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Số môn học tối đa</span>
                <strong className="text-slate-900 dark:text-white">{premium ? 'Không giới hạn' : 'Tối đa 4 môn'}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Ghi âm bài giảng</span>
                <strong className="text-slate-900 dark:text-white">{premium ? '3,000 phút/tháng' : '300 phút/tháng'}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Hỏi đáp trợ giảng AI</span>
                <strong className="text-slate-900 dark:text-white">{premium ? 'Không giới hạn' : 'Cơ bản'}</strong>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('billing')}
              className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-colors"
            >
              Xem chi tiết gói dịch vụ & Hóa đơn
            </button>
          </div>
        </div>

        {/* Right Column: Editable Profile Fields */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thông tin học tập cá nhân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Các thông tin này giúp StudySync AI tối ưu hóa lộ trình và gợi ý học tập chuẩn xác hơn cho bạn.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Minh"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Địa chỉ Email (Đã xác minh)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-medium cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Địa chỉ email được liên kết cố định với mã số sinh viên và tài khoản xác thực của bạn.
                </p>
              </div>

              {/* School */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Trường đại học / Cao đẳng
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Ví dụ: Đại học Quốc Gia TP.HCM"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Major */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ngành học
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="Ví dụ: Kỹ thuật Phần mềm"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Năm học
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="Năm 1">Sinh viên Năm 1</option>
                  <option value="Năm 2">Sinh viên Năm 2</option>
                  <option value="Năm 3">Sinh viên Năm 3</option>
                  <option value="Năm 4">Sinh viên Năm 4</option>
                  <option value="Năm 5+">Năm 5+ / Cao học</option>
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Múi giờ làm việc
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="Asia/Ho_Chi_Minh"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Notification settings */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-indigo-500" />
                <span>Cài đặt thông báo & Nhắc nhở</span>
              </h4>

              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remind1Day}
                    onChange={(e) => setRemind1Day(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Nhắc nhở deadline trước 24 giờ qua hệ thống
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remind3Days}
                    onChange={(e) => setRemind3Days(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Nhắc nhở chuẩn bị bài tập lớn & đồ án trước 3 ngày
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiNotifications}
                    onChange={(e) => setAiNotifications(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Thông báo khi trợ giảng AI hoàn tất tóm tắt hoặc trích xuất tài liệu
                  </span>
                </label>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-60 transition-all"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu thông tin hồ sơ</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
