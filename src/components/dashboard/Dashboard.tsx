import React from 'react';
import { useApp } from '../../context/AppContext';
import { getRemainingUsage, isPremium } from '../../utils/planLimits';
import { formatDate, formatDuration, getPriorityLabel, getDeadlineUrgency } from '../../utils/formatters';
import {
  Mic,
  FileUp,
  BookOpen,
  CalendarCheck,
  Bot,
  Crown,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    currentUser,
    subjects,
    lessons,
    deadlines,
    flashcards,
    usage,
    setActiveTab,
    setActiveSubjectId,
    setActiveLessonId,
    setUpgradeModalOpen,
    language,
    t,
  } = useApp();

  const remaining = getRemainingUsage(currentUser, usage);
  const premium = isPremium(currentUser);

  // Time-based greeting
  const hour = new Date().getHours();
  let greeting = language === 'vi' ? 'Chào buổi sáng' : 'Good morning';
  if (hour >= 12 && hour < 18) {
    greeting = language === 'vi' ? 'Chào buổi chiều' : 'Good afternoon';
  } else if (hour >= 18) {
    greeting = language === 'vi' ? 'Chào buổi tối' : 'Good evening';
  }

  // Recent lessons (top 3)
  const recentLessons = [...lessons].slice(0, 3);

  // Upcoming deadlines (sort by date)
  const upcomingDeadlines = [...deadlines]
    .filter((d) => d.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  // Average progress across subjects
  const avgProgress =
    subjects.length > 0
      ? Math.round(subjects.reduce((acc, s) => acc + (s.progress || 0), 0) / subjects.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {language === 'vi' ? 'Học kỳ 1 năm học 2026 - 2027' : 'Semester 1 • Academic Year 2026 - 2027'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              {greeting}, {currentUser?.fullName || (language === 'vi' ? 'bạn' : 'there')}! 👋
            </h1>
            <p className="text-indigo-100 text-sm leading-relaxed">
              {language === 'vi' ? (
                <>
                  Bạn đang quản lý <strong>{subjects.length} môn học</strong> và có{' '}
                  <strong>{upcomingDeadlines.length} bài tập/deadline</strong> cần chú ý trong tuần này. Hãy bắt đầu ghi âm hoặc ôn tập nhé!
                </>
              ) : (
                <>
                  You are managing <strong>{subjects.length} courses</strong> with{' '}
                  <strong>{upcomingDeadlines.length} upcoming deadlines</strong> this week. Start recording lectures or reviewing your notes!
                </>
              )}
            </p>
          </div>

          {/* Quick AI Action Card */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <button
              onClick={() => setActiveTab('recorder')}
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white text-indigo-950 font-extrabold text-sm shadow-lg hover:bg-indigo-50 transition-all transform active:scale-95"
            >
              <Mic className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>{t.menuRecorder}</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-chat')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-sm border border-white/20 transition-all"
            >
              <Bot className="w-4 h-4 text-purple-300" />
              <span>{t.quickActionAiChat}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Subjects */}
        <div
          onClick={() => setActiveTab('subjects')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.menuSubjects}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {subjects.length}
            </span>
            <span className="text-xs text-slate-400">
              {premium ? `(${t.unlimitedCourses})` : `/ 4 ${t.courseLimitBadge} (${t.freePlan})`}
            </span>
          </div>
          <div className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <span>{t.viewAll}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Stat 2: Lessons */}
        <div
          onClick={() => setActiveTab('subjects')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.tabLessons}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {lessons.length}
            </span>
            <span className="text-xs text-slate-400">{language === 'vi' ? 'bài giảng AI' : 'lectures'}</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <span>{language === 'vi' ? 'Đã tóm tắt' : 'Summarized'}</span>
            <Sparkles className="w-3 h-3" />
          </div>
        </div>

        {/* Stat 3: Deadlines */}
        <div
          onClick={() => setActiveTab('deadlines')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.statsPendingDeadlines}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {upcomingDeadlines.length}
            </span>
            <span className="text-xs text-amber-600 font-semibold">{language === 'vi' ? 'cần hoàn thành' : 'to complete'}</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span>{language === 'vi' ? 'Xem lịch trình' : 'View Schedule'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Stat 4: Average Progress */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {language === 'vi' ? 'Tiến độ kỳ học' : 'Semester Progress'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {avgProgress}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold">{language === 'vi' ? 'trung bình' : 'average'}</span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('recorder')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">{t.menuRecorder}</div>
            <div className="text-[11px] text-slate-400">{language === 'vi' ? 'Mic trực tiếp trên lớp' : 'Live mic in class'}</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">{t.menuDocuments}</div>
            <div className="text-[11px] text-slate-400">{language === 'vi' ? 'PDF, Audio, Slide' : 'PDF, Audio, Slides'}</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('deadlines')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">{t.addDeadlineBtn}</div>
            <div className="text-[11px] text-slate-400">{language === 'vi' ? 'Bài tập & Kỳ thi' : 'Assignments & Exams'}</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-pink-400 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">{t.quickActionFlashcards}</div>
            <div className="text-[11px] text-slate-400">
              {flashcards.length} {language === 'vi' ? 'thẻ đang có' : 'active cards'}
            </div>
          </div>
        </button>
      </div>

      {/* Main Content 2-Column: Recent Lessons & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Recent Lessons & Subjects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Lessons */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.recentLecturesTitle}</h3>
                <p className="text-xs text-slate-400">
                  {language === 'vi' ? 'Xem lại tóm tắt, sơ đồ tư duy và ghi chép' : 'Review summaries, mind maps and lecture transcripts'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>{t.viewAll}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentLessons.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {t.noLecturesDesc}
              </div>
            ) : (
              <div className="space-y-3">
                {recentLessons.map((lesson) => {
                  const subject = subjects.find((s) => s.id === lesson.subjectId);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setActiveSubjectId(lesson.subjectId);
                        setActiveLessonId(lesson.id);
                        setActiveTab('subject-detail');
                      }}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-xs shadow-xs"
                          style={{ backgroundColor: subject?.color || '#6366F1' }}
                        >
                          {subject?.code?.slice(0, 3) || 'MH'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {lesson.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{subject?.name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(lesson.lessonDate, language)}
                            </span>
                            {lesson.audioDuration && (
                              <>
                                <span>•</span>
                                <span>{formatDuration(lesson.audioDuration)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="w-3 h-3" />
                          {language === 'vi' ? 'AI Tóm tắt' : 'AI Summary'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subjects Grid Preview */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'vi' ? 'Môn học đang theo học' : 'Enrolled Courses'}
                </h3>
                <p className="text-xs text-slate-400">
                  {premium
                    ? t.unlimitedCourses
                    : `${language === 'vi' ? 'Đã dùng' : 'Used'} ${subjects.length}/4 ${t.courseLimitBadge} (${t.freePlan})`}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t.viewAll}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => {
                    setActiveSubjectId(sub.id);
                    setActiveTab('subject-detail');
                  }}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold mb-3"
                    style={{ backgroundColor: sub.color }}
                  >
                    {sub.code?.slice(0, 2) || 'CS'}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                    {sub.name}
                  </h4>
                  <div className="text-xs text-slate-400 mt-1 mb-3">
                    {sub.lecturer || (language === 'vi' ? 'Giảng viên khoa' : 'Faculty Instructor')}
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>{language === 'vi' ? 'Tiến độ' : 'Progress'}</span>
                      <span>{sub.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${sub.progress}%`, backgroundColor: sub.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Upcoming Deadlines & Usage details */}
        <div className="space-y-6">
          {/* Deadlines Widget */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.upcomingDeadlinesSection}</h3>
              </div>
              <button
                onClick={() => setActiveTab('deadlines')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {language === 'vi' ? 'Xem lịch' : 'View Calendar'}
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                {t.allDeadlinesDone}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((dl) => {
                  const priority = getPriorityLabel(dl.priority, language);
                  const urgency = getDeadlineUrgency(dl.dueDate, dl.status);
                  const subject = subjects.find((s) => s.id === dl.subjectId);

                  return (
                    <div
                      key={dl.id}
                      onClick={() => setActiveTab('deadlines')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        urgency === 'overdue'
                          ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20'
                          : urgency === 'due_soon'
                          ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {dl.title}
                        </h4>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${priority.bg} ${priority.color} shrink-0`}>
                          {priority.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        <span className="truncate max-w-[120px] font-medium text-slate-600 dark:text-slate-300">
                          {subject?.name || (language === 'vi' ? 'Môn học' : 'Course')}
                        </span>
                        <span className={`font-bold ${urgency === 'overdue' ? 'text-red-600' : urgency === 'due_soon' ? 'text-amber-600' : ''}`}>
                          {formatDate(dl.dueDate, language)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Usage & Upgrade Box */}
          <div className="p-6 rounded-3xl bg-linear-to-b from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {language === 'vi' ? `Tài nguyên tháng ${usage.month}` : `Resources for ${usage.month}`}
              </span>
              {premium && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-black">
                  VIP Active
                </span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300">{t.audioMinutesProgress}</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {remaining.audioMinutesUsed} / {remaining.audioMinutesLimit} {language === 'vi' ? 'phút' : 'mins'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${remaining.audioPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300">{t.aiCallsProgress}</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {remaining.aiRequestsUsed} / {remaining.aiRequestsLimit} {language === 'vi' ? 'lần' : 'calls'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${remaining.aiPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {!premium ? (
              <button
                onClick={() => setUpgradeModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>{t.upgrade}</span>
              </button>
            ) : (
              <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'vi' ? 'Bạn đang sử dụng quyền lợi không giới hạn' : 'Unlimited VIP privileges active'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
