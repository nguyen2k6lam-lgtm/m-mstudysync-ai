import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { isPremium } from '../../utils/planLimits';
import { getSystemStatus } from '../../services/api';
import {
  Sparkles,
  Crown,
  Bell,
  LogOut,
  User as UserIcon,
  RotateCcw,
  Menu,
  GraduationCap,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const {
    currentUser,
    isAuthenticated,
    openAuthModal,
    logout,
    setActiveTab,
    setUpgradeModalOpen,
    resetToDemoData,
    deadlines,
    showToast,
    t,
  } = useApp();

  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    getSystemStatus().then((st) => setHasApiKey(st.hasApiKey));
  }, []);

  const upcomingDeadlinesCount = deadlines.filter((d) => d.status !== 'completed').length;
  const premium = isPremium(currentUser);

  const handleResetDemoData = () => {
    resetToDemoData();
    showToast(t.demoDataRestored, 'success');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left side: Mobile Toggle & Brand/Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t.openMenuTooltip}
          aria-label={t.openMenuTooltip}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand for mobile/desktop top */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <img
            src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
            alt="Mầm Study Logo"
            className="h-10 w-auto object-contain rounded-lg group-hover:scale-105 transition-transform shrink-0"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base sm:text-lg tracking-tight bg-linear-to-r from-[#4ADE80] to-[#2DD4BF] bg-clip-text text-transparent">
              Mầm Study
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-[#4ADE80] border border-emerald-500/30">
              AI
            </span>
          </div>
        </div>

        {/* AI Engine Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80">
          <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-slate-600 dark:text-slate-300 font-semibold">
            {hasApiKey ? 'Gemini 3.8 Flash' : 'AI Studio Demo'}
          </span>
        </div>
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Reset Demo Data button */}
        <button
          onClick={handleResetDemoData}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 transition-colors"
          title={t.demoDataTooltip}
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
          <span>{t.demoDataBtn}</span>
        </button>

        {/* Premium Upgrade CTA or Badge */}
        {isAuthenticated && (
          premium ? (
            <div
              onClick={() => setActiveTab('premium')}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs hover:opacity-90"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.premiumVipBadge}</span>
            </div>
          ) : (
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all transform active:scale-95"
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.upgrade}</span>
              <span className="sm:hidden">Premium</span>
            </button>
          )
        )}

        {/* Deadline notification badge */}
        <button
          onClick={() => setActiveTab('deadlines')}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t.upcomingDeadlinesTooltip}
        >
          <Bell className="w-5 h-5" />
          {upcomingDeadlinesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
              {upcomingDeadlinesCount}
            </span>
          )}
        </button>

        {/* Language selector toggle with keyboard shortcut */}
        <LanguageToggle variant="navbar" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User Account / Login */}
        {isAuthenticated && currentUser ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-600/30"
              />
              <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {currentUser.fullName}
              </span>
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {premium ? t.premiumPlan : `${t.freePlan} (≤4 ${t.courseLimitBadge})`}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-indigo-500" />
                    <span>{t.userMenuProfile}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-slate-500" />
                    <span>{t.userMenuSettings}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Crown className="w-4 h-4 text-purple-500" />
                    <span>{t.userMenuBilling}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('premium')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>{t.userMenuVip}</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.userMenuLogout}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAuthModal('login')}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors"
            >
              {t.login}
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              {t.register}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
