import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getRemainingUsage, isPremium } from '../../utils/planLimits';
import {
  LayoutDashboard,
  BookOpen,
  Mic,
  FileText,
  Layers,
  HelpCircle,
  CalendarCheck,
  Users,
  Bot,
  Crown,
  Settings,
  Sparkles,
  X,
  FileUp,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    subjects,
    usage,
    setUpgradeModalOpen,
    t,
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const remaining = getRemainingUsage(currentUser, usage);
  const premium = isPremium(currentUser);

  const menuItems = [
    { id: 'dashboard', label: t.menuDashboard, icon: LayoutDashboard },
    {
      id: 'subjects',
      label: t.menuSubjects,
      icon: BookOpen,
      badge: `${subjects.length}${premium ? '' : '/4'}`,
    },
    { id: 'recorder', label: t.menuRecorder, icon: Mic, highlight: true },
    { id: 'debug-audio', label: t.menuDebugAudio, icon: Activity },
    { id: 'documents', label: t.menuDocuments, icon: FileUp },
    { id: 'flashcards', label: t.menuFlashcards, icon: Layers },
    { id: 'quizzes', label: t.menuQuizzes, icon: HelpCircle },
    { id: 'deadlines', label: t.menuDeadlines, icon: CalendarCheck },
    { id: 'groups', label: t.menuGroups, icon: Users },
    { id: 'ai-chat', label: t.menuAiChat, icon: Bot, isAi: true },
    { id: 'premium', label: t.menuPremium, icon: Crown, isGold: true },
    { id: 'settings', label: t.menuSettings, icon: Settings },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        {/* Top Header */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <div
              onClick={() => handleNavClick('dashboard')}
              className={`flex items-center gap-2.5 cursor-pointer ${isCollapsed ? 'mx-auto' : ''}`}
            >
              <img
                src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
                alt="Mầm Study Logo"
                className="h-10 w-auto object-contain rounded-lg shrink-0"
              />
              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-linear-to-r from-[#4ADE80] to-[#2DD4BF] bg-clip-text text-transparent">
                    Mầm Study
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-[#4ADE80] border border-emerald-500/30">
                    AI
                  </span>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t.collapseSidebar}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop expand button when collapsed */}
          {isCollapsed && (
            <div className="hidden lg:flex justify-center py-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t.expandSidebar}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nav List */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-sm font-semibold transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : item.highlight
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${
                        isActive
                          ? 'text-white'
                          : item.isGold
                          ? 'text-amber-500'
                          : item.isAi
                          ? 'text-purple-500'
                          : item.highlight
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Usage Progress & Plan Status */}
        <div className={`p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? (
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="w-10 h-10 mx-auto rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md hover:bg-amber-600 transition-colors"
              title={premium ? t.premiumPlan : t.upgrade}
            >
              <Crown className="w-5 h-5" />
            </button>
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-800/90 p-3.5 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  {premium ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t.premiumPlan}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>{t.freePlan}</span>
                    </>
                  )}
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {premium ? t.unlimitedCourses : `${subjects.length}/4 ${t.courseLimitBadge}`}
                </span>
              </div>

              {/* Audio Minutes Progress */}
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{t.audioMinutesProgress}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {remaining.audioMinutesUsed}/{remaining.audioMinutesLimit} m
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${remaining.audioPercent}%` }}
                  />
                </div>
              </div>

              {/* AI Requests Progress */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{t.aiCallsProgress}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {remaining.aiRequestsUsed}/{remaining.aiRequestsLimit}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${remaining.aiPercent}%` }}
                  />
                </div>
              </div>

              {!premium && (
                <button
                  onClick={() => setUpgradeModalOpen(true)}
                  className="w-full py-1.5 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  {t.upgrade}
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
