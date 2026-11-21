import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Subject } from '../../types';
import { SubjectModal } from './SubjectModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { canCreateSubject, isPremium } from '../../utils/planLimits';
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Clock,
  Trash2,
  Edit2,
  Crown,
  FileText,
  CalendarCheck,
} from 'lucide-react';

export const SubjectList: React.FC = () => {
  const {
    currentUser,
    subjects,
    lessons,
    deadlines,
    addSubject,
    updateSubject,
    deleteSubject,
    setActiveSubjectId,
    setActiveTab,
    setUpgradeModalOpen,
    language,
    t,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const premium = isPremium(currentUser);
  const canAddMore = canCreateSubject(currentUser, subjects.length);

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.lecturer && s.lecturer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddClick = () => {
    if (!canAddMore) {
      setUpgradeModalOpen(true);
      return;
    }
    setEditingSubject(null);
    setModalOpen(true);
  };

  const handleEditClick = (sub: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(sub);
    setModalOpen(true);
    setMenuOpenId(null);
  };

  const handleDeleteClick = (sub: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSubject(sub);
    setMenuOpenId(null);
  };

  const handleCardClick = (subId: string) => {
    setActiveSubjectId(subId);
    setActiveTab('subject-detail');
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'vi' ? 'Môn học của tôi' : 'My Courses'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              {subjects.length} {premium ? (language === 'vi' ? 'môn (VIP)' : 'courses (VIP)') : `/ 4 ${t.courseLimitBadge} (Free)`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {premium
              ? (language === 'vi' ? 'Bạn đang kích hoạt gói VIP: Tạo và quản lý không giới hạn môn học!' : 'VIP Active: Create and manage unlimited courses without restrictions!')
              : (language === 'vi' ? 'Gói Miễn phí quản lý tối đa 4 môn. Nâng cấp Premium để học không giới hạn.' : 'Free plan supports up to 4 courses. Upgrade to Premium for unlimited learning.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!canAddMore && (
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/20 transition-colors"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>{language === 'vi' ? 'Đã đạt giới hạn 4 môn (Nâng cấp)' : 'Reached 4-course limit (Upgrade)'}</span>
            </button>
          )}

          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addCourseBtn}</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchCoursesPlaceholder}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Subjects Cards Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {t.noCoursesFound}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
            {searchQuery
              ? (language === 'vi' ? 'Thử tìm với từ khóa khác' : 'Try searching with different keywords')
              : t.noCoursesFoundDesc}
          </p>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            {t.addCourseBtn}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub) => {
            const subjectLessons = lessons.filter((l) => l.subjectId === sub.id);
            const subjectDeadlines = deadlines.filter((d) => d.subjectId === sub.id && d.status !== 'completed');

            return (
              <div
                key={sub.id}
                onClick={() => handleCardClick(sub.id)}
                className="group relative p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-indigo-400/60 dark:hover:border-indigo-500/60 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top bar with color badge & menu */}
                  <div className="flex items-start justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs"
                        style={{ backgroundColor: sub.color }}
                      >
                        {sub.code?.slice(0, 3) || 'MH'}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {sub.code}
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === sub.id ? null : sub.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={t.actions}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpenId === sub.id && (
                        <div
                          className="absolute right-0 mt-1 w-36 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleEditClick(sub, e)}
                            className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>{t.edit}</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(sub, e)}
                            className="w-full px-3 py-1.5 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t.delete}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                    {sub.description || (language === 'vi' ? 'Chưa có mô tả cho môn học này.' : 'No description provided for this course.')}
                  </p>

                  {/* Lecturer and Schedule */}
                  <div className="space-y-1 mb-4 text-[11px] text-slate-600 dark:text-slate-400">
                    {sub.lecturer && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {language === 'vi' ? 'GV:' : 'Instructor:'}
                        </span>
                        <span>{sub.lecturer}</span>
                      </div>
                    )}
                    {sub.schedule && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{sub.schedule}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {/* Badges for lessons & deadlines count */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {subjectLessons.length} {language === 'vi' ? 'bài học' : 'lessons'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      {subjectDeadlines.length} {language === 'vi' ? 'deadline' : 'deadlines'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>{language === 'vi' ? 'Tiến độ hoàn thành' : 'Completion progress'}</span>
                      <span>{sub.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${sub.progress || 0}%`, backgroundColor: sub.color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for adding/editing */}
      <SubjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => {
          if (editingSubject) {
            updateSubject(editingSubject.id, data);
          } else {
            addSubject(data);
          }
        }}
        initialData={editingSubject}
      />

      {/* Confirm Delete Subject Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingSubject}
        onClose={() => setDeletingSubject(null)}
        onConfirm={async () => {
          if (deletingSubject) {
            await deleteSubject(deletingSubject.id);
            setDeletingSubject(null);
          }
        }}
        title={t.deleteCourseConfirmTitle}
        message={t.confirmDeleteWarning}
        warningNote={t.deleteCourseConfirmDesc}
        itemTitle={deletingSubject?.name}
        confirmText={t.delete}
        cancelText={t.cancel}
      />
    </div>
  );
};
