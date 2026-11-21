import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';
import { Sparkles, Check, Crown, Zap, BookOpen, ShieldCheck } from 'lucide-react';

export const UpgradeModal: React.FC = () => {
  const { upgradeModalOpen, setUpgradeModalOpen, upgradeToPremium, setActiveTab, language, formatCurrency } = useApp();

  const handleUpgrade = () => {
    upgradeToPremium();
    setActiveTab('premium');
  };

  return (
    <Modal
      isOpen={upgradeModalOpen}
      onClose={() => setUpgradeModalOpen(false)}
      maxWidth="lg"
    >
      <div className="text-center">
        {/* Crown Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-linear-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-bounce">
          <Crown className="w-8 h-8 text-white" />
        </div>

        {/* Demo Mode Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          {language === 'vi' ? 'Chế độ mô phỏng (Demo Mode)' : 'Simulation Mode (Demo Mode)'}
        </div>

        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          {language === 'vi' ? 'Mở khóa Quản lý Môn học Không giới hạn' : 'Unlock Unlimited Course Management'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
          {language === 'vi' ? (
            <>
              Tài khoản Free hiện đã đạt giới hạn <strong>4 môn học</strong>. Nâng cấp lên gói{' '}
              <strong>Mầm Study Premium</strong> để đồng hành cùng bạn suốt những năm tháng đại học!
            </>
          ) : (
            <>
              Your Free account has reached the limit of <strong>4 courses</strong>. Upgrade to{' '}
              <strong>Mầm Study Premium</strong> to accompany you throughout your university journey!
            </>
          )}
        </p>

        {/* Benefits list */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-left mb-6 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>
              {language === 'vi' ? (
                <>
                  <strong>Quản lý không giới hạn số môn học</strong> (vượt trên 4 môn)
                </>
              ) : (
                <>
                  <strong>Unlimited courses</strong> (beyond the 4-course limit)
                </>
              )}
            </span>
          </div>

          <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>
              {language === 'vi' ? (
                <>
                  <strong>Tăng thời lượng ghi âm:</strong> 3.000 phút/tháng (thay vì 300 phút)
                </>
              ) : (
                <>
                  <strong>Increased recording quota:</strong> 3,000 mins/month (instead of 300 mins)
                </>
              )}
            </span>
          </div>

          <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>
              {language === 'vi' ? (
                <>
                  <strong>Trợ giảng AI không giới hạn</strong> với mô hình Gemini mới nhất
                </>
              ) : (
                <>
                  <strong>Unlimited AI Tutor</strong> powered by the latest Gemini models
                </>
              )}
            </span>
          </div>

          <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>
              {language === 'vi' ? (
                <>
                  <strong>Sơ đồ tư duy & Bộ Flashcard chuyên sâu</strong> xuất file PNG/PDF
                </>
              ) : (
                <>
                  <strong>Advanced Mind Maps & Flashcards</strong> with PNG/PDF export
                </>
              )}
            </span>
          </div>
        </div>

        {/* Pricing tag */}
        <div className="flex items-baseline justify-center gap-2 mb-6">
          <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(79000)}
          </span>
          <span className="text-slate-500 text-sm">
            {language === 'vi'
              ? `/ tháng (hoặc ${formatCurrency(699000)} / năm)`
              : `/ month (or ${formatCurrency(699000)} / year)`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setUpgradeModalOpen(false)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {language === 'vi' ? 'Để sau' : 'Maybe Later'}
          </button>
          <button
            onClick={handleUpgrade}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
          >
            <Zap className="w-4 h-4" />
            {language === 'vi' ? 'Nâng cấp Premium ngay (1-Click Demo)' : 'Upgrade to Premium Now (1-Click Demo)'}
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          {language === 'vi'
            ? '* Trong môi trường thử nghiệm, nút trên sẽ kích hoạt quyền Premium ngay lập tức mà không trừ tiền thật.'
            : '* In demo mode, the button above activates Premium privileges immediately without real charges.'}
        </p>
      </div>
    </Modal>
  );
};
