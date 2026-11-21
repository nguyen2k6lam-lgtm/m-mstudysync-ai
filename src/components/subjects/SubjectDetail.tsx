import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LessonDetail } from '../lessons/LessonDetail';
import { FlashcardDeck } from '../flashcards/FlashcardDeck';
import { QuizPlayer } from '../quiz/QuizPlayer';
import { DeadlineManager } from '../deadlines/DeadlineManager';
import { StudyGroupView } from '../groups/StudyGroupView';
import { AiTutorChat } from '../chat/AiTutorChat';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { formatDate, formatDuration } from '../../utils/formatters';
import {
  ArrowLeft,
  LayoutDashboard,
  FileText,
  Layers,
  HelpCircle,
  CalendarCheck,
  Users,
  Bot,
  Mic,
  Clock,
  BookOpen,
  Trash2,
} from 'lucide-react';

export const SubjectDetail: React.FC = () => {
  const {
    subjects,
    activeSubjectId,
    setActiveSubjectId,
    lessons,
    activeLessonId,
    setActiveLessonId,
    deleteSubject,
    setActiveTab,
    language,
    t,
  } = useApp();

  const [currentSubTab, setCurrentSubTab] = useState<
    'overview' | 'lessons' | 'flashcards' | 'quizzes' | 'deadlines' | 'groups' | 'chat'
  >('overview');

  const [deleteSubjectModalOpen, setDeleteSubjectModalOpen] = useState(false);

  const subject = subjects.find((s) => s.id === activeSubjectId) || subjects[0];
  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{language === 'vi' ? 'Không tìm thấy thông tin môn học.' : 'Course not found.'}</p>
        <button
          onClick={() => setActiveTab('subjects')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          {language === 'vi' ? 'Quay lại danh sách môn' : 'Back to Course List'}
        </button>
      </div>
    );
  }

  const subjectLessons = lessons.filter((l) => l.subjectId === subject.id);
  const activeLesson = subjectLessons.find((l) => l.id === activeLessonId) || subjectLessons[0];

  const subTabs = [
    { id: 'overview', label: language === 'vi' ? 'Tổng quan' : 'Overview', icon: LayoutDashboard },
    { id: 'lessons', label: `${language === 'vi' ? 'Bài học' : 'Lessons'} (${subjectLessons.length})`, icon: FileText },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quizzes', label: language === 'vi' ? 'Trắc nghiệm' : 'Quizzes', icon: HelpCircle },
    { id: 'deadlines', label: 'Deadlines', icon: CalendarCheck },
    { id: 'groups', label: language === 'vi' ? 'Nhóm học' : 'Study Groups', icon: Users },
    { id: 'chat', label: language === 'vi' ? 'Chat với AI' : 'AI Tutor', icon: Bot, isAi: true },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Subject Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('subjects')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'vi' ? 'Tất cả môn học' : 'All Courses'}</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-md shrink-0"
              style={{ backgroundColor: subject.color }}
            >
              {subject.code?.slice(0, 3) || 'MH'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {subject.code}
                </span>
                {subject.lecturer && (
                  <span className="text-xs font-semibold text-slate-500">
                    {language === 'vi' ? 'GV:' : 'Instructor:'} {subject.lecturer}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {subject.name}
              </h2>
              {subject.schedule && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{subject.schedule}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveTab('recorder');
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-transform active:scale-95"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>{t.menuRecorder}</span>
            </button>

            <button
              onClick={() => setDeleteSubjectModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-bold text-xs transition-colors"
              title={language === 'vi' ? 'Xóa môn học này' : 'Delete this course'}
            >
              <Trash2 className="w-4 h-4" />
              <span>{language === 'vi' ? 'Xóa môn' : 'Delete Course'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-6 border-t border-slate-100 dark:border-slate-800 pt-3 overflow-x-auto no-scrollbar">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentSubTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setCurrentSubTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.isAi ? 'text-purple-400' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {currentSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                {language === 'vi' ? 'Mô tả môn học' : 'Course Description'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {subject.description || (language === 'vi' ? 'Chưa cập nhật mô tả cho môn học này.' : 'No description provided for this course.')}
              </p>
            </div>

            {/* Latest Lessons Preview */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'vi' ? 'Bài học gần nhất' : 'Recent Lessons'}
                </h3>
                <button
                  onClick={() => setCurrentSubTab('lessons')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  {language === 'vi' ? 'Xem toàn bộ' : 'View All'} ({subjectLessons.length})
                </button>
              </div>

              {subjectLessons.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {t.noLessonsFoundDesc}
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectLessons.map((les) => (
                    <div
                      key={les.id}
                      onClick={() => {
                        setActiveLessonId(les.id);
                        setCurrentSubTab('lessons');
                      }}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {les.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{formatDate(les.lessonDate, language)}</span>
                          {les.audioDuration && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(les.audioDuration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        {language === 'vi' ? 'Chi tiết' : 'Details'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Progress & shortcuts */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                {language === 'vi' ? 'Tiến độ học tập' : 'Study Progress'}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{language === 'vi' ? 'Hoàn thành kỳ học' : 'Semester Completion'}</span>
                  <span>{subject.progress || 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${subject.progress || 0}%`, backgroundColor: subject.color }}
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'vi' ? 'Tổng số bài giảng:' : 'Total Lectures:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{subjectLessons.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'vi' ? 'Ngày học gần nhất:' : 'Last Studied:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatDate(subject.lastStudiedAt, language)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lessons List & Detail */}
      {currentSubTab === 'lessons' && (
        <div className="space-y-4">
          {/* Multiple Lessons Selector Pills */}
          {subjectLessons.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              <span className="text-xs font-bold text-slate-400 shrink-0">
                {language === 'vi' ? 'Chọn bài học:' : 'Select Lesson:'}
              </span>
              {subjectLessons.map((les) => (
                <button
                  key={les.id}
                  onClick={() => setActiveLessonId(les.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    les.id === (activeLesson?.id)
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {les.title}
                </button>
              ))}
            </div>
          )}

          {activeLesson ? (
            <LessonDetail lesson={activeLesson} subject={subject} />
          ) : (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                {t.noLessonsFound}
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                {t.noLessonsFoundDesc}
              </p>
              <button
                onClick={() => setActiveTab('recorder')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                {t.startRecordingBtn}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Flashcards */}
      {currentSubTab === 'flashcards' && (
        <FlashcardDeck filterSubjectId={subject.id} />
      )}

      {/* Tab 4: Quizzes */}
      {currentSubTab === 'quizzes' && (
        <QuizPlayer filterSubjectId={subject.id} />
      )}

      {/* Tab 5: Deadlines */}
      {currentSubTab === 'deadlines' && (
        <DeadlineManager filterSubjectId={subject.id} />
      )}

      {/* Tab 6: Groups */}
      {currentSubTab === 'groups' && (
        <StudyGroupView filterSubjectId={subject.id} />
      )}

      {/* Tab 7: AI Chat */}
      {currentSubTab === 'chat' && (
        <AiTutorChat
          initialSubjectId={subject.id}
          initialScope="subject"
        />
      )}

      {/* Confirm Delete Subject Modal */}
      <ConfirmDeleteModal
        isOpen={deleteSubjectModalOpen}
        onClose={() => setDeleteSubjectModalOpen(false)}
        onConfirm={async () => {
          const ok = await deleteSubject(subject.id);
          if (ok) {
            setActiveTab('subjects');
          }
        }}
        title={t.deleteCourseConfirmTitle}
        message={t.confirmDeleteWarning}
        warningNote={t.deleteCourseConfirmDesc}
        itemTitle={subject.name}
        confirmText={t.delete}
        cancelText={t.cancel}
      />
    </div>
  );
};
