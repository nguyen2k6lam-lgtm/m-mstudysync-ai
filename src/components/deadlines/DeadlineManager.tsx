import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Deadline, DeadlinePriority, DeadlineType, DeadlineStatus } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { extractDeadlines } from '../../services/api';
import {
  formatDate,
  formatDateTime,
  getPriorityLabel,
  getDeadlineTypeLabel,
  getDeadlineUrgency,
  getStatusLabel,
  safeConfirm,
} from '../../utils/formatters';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Columns,
  List,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  Users,
  User,
  ArrowRight,
  ChevronRight,
  Upload,
  FileText,
  Check,
  Bot,
} from 'lucide-react';

interface DeadlineManagerProps {
  filterSubjectId?: string;
}

export const DeadlineManager: React.FC<DeadlineManagerProps> = ({ filterSubjectId }) => {
  const {
    deadlines,
    subjects,
    activeSubjectId,
    addDeadline,
    updateDeadline,
    deleteDeadline,
    toggleDeadlineChecklistItem,
    incrementAiUsage,
    showToast,
    language,
  } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(
    filterSubjectId || activeSubjectId || 'all'
  );
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'group'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create/Edit manual modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDl, setEditingDl] = useState<Deadline | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [dueTime, setDueTime] = useState('23:59');
  const [type, setType] = useState<DeadlineType>('assignment');
  const [priority, setPriority] = useState<DeadlinePriority>('medium');
  const [isGroup, setIsGroup] = useState(false);

  // AI Extraction Modal State ("Nhận thời hạn giao diện bằng AI")
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [aiSubjectId, setAiSubjectId] = useState(subjects[0]?.id || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [detectedDeadlines, setDetectedDeadlines] = useState<any[]>([]);
  const [selectedDetectedIndices, setSelectedDetectedIndices] = useState<number[]>([]);

  // Filter deadlines
  const filteredDeadlines = deadlines.filter((dl) => {
    if (selectedSubjectFilter !== 'all' && dl.subjectId !== selectedSubjectFilter) return false;
    if (selectedPriorityFilter !== 'all' && dl.priority !== selectedPriorityFilter) return false;
    if (scopeFilter === 'personal' && dl.groupId) return false;
    if (scopeFilter === 'group' && !dl.groupId) return false;
    if (searchQuery && !dl.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleOpenCreate = () => {
    setEditingDl(null);
    setTitle('');
    setDesc('');
    setSubjectId(selectedSubjectFilter !== 'all' ? selectedSubjectFilter : (subjects[0]?.id || ''));
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setDueTime('23:59');
    setType('assignment');
    setPriority('medium');
    setIsGroup(false);
    setModalOpen(true);
  };

  const handleSaveDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      showToast(
        language === 'vi' ? 'Tiêu đề và ngày đến hạn là bắt buộc' : 'Title and due date are required',
        'error'
      );
      return;
    }

    if (editingDl) {
      updateDeadline(editingDl.id, {
        title: title.trim(),
        description: desc.trim(),
        subjectId,
        dueDate,
        dueTime,
        type,
        priority,
        groupId: isGroup ? 'grp_web_k65' : undefined,
      });
      showToast(language === 'vi' ? 'Đã cập nhật deadline!' : 'Deadline updated!', 'success');
    } else {
      addDeadline({
        subjectId,
        groupId: isGroup ? 'grp_web_k65' : undefined,
        title: title.trim(),
        description: desc.trim(),
        type,
        dueDate,
        dueTime,
        priority,
        status: 'todo',
        sourceType: 'manual',
        reminderSettings: { remind1Day: true, remind3Days: true, remindDueDay: true },
        checklist: [
          {
            id: '1',
            text: language === 'vi' ? 'Nghiên cứu tài liệu và đề cương' : 'Review materials and syllabus',
            done: false,
          },
          {
            id: '2',
            text: language === 'vi' ? 'Hoàn thiện bản nháp' : 'Complete first draft',
            done: false,
          },
          {
            id: '3',
            text: language === 'vi' ? 'Nộp bài lên cổng đào tạo' : 'Submit to LMS portal',
            done: false,
          },
        ],
      });
    }

    setModalOpen(false);
  };

  const handleStatusChange = (dlId: string, newStatus: DeadlineStatus) => {
    updateDeadline(dlId, { status: newStatus });
    showToast(
      language === 'vi' ? 'Đã cập nhật trạng thái deadline.' : 'Deadline status updated.',
      'success'
    );
  };

  // AI Extraction logic
  const handleExtractWithAi = async () => {
    if (!aiInputText.trim()) {
      showToast(
        language === 'vi'
          ? 'Vui lòng dán đề cương, email thông báo hoặc lịch giảng dạy!'
          : 'Please paste syllabus, announcement email, or teaching schedule!',
        'error'
      );
      return;
    }

    setIsExtracting(true);
    setDetectedDeadlines([]);

    try {
      const subject = subjects.find((s) => s.id === aiSubjectId);
      const res = await extractDeadlines({
        text: aiInputText,
        subjectName: subject?.name || (language === 'vi' ? 'Môn học' : 'Subject'),
      });

      const items = res.deadlines || [];
      setDetectedDeadlines(items);
      // Select all by default
      setSelectedDetectedIndices(items.map((_, i) => i));
      incrementAiUsage(1);

      if (items.length === 0) {
        showToast(
          language === 'vi'
            ? 'AI không tìm thấy mốc thời gian cụ thể nào trong đoạn văn.'
            : 'AI found no specific deadlines in the text.',
          'info'
        );
      } else {
        showToast(
          language === 'vi'
            ? `AI đã phát hiện ${items.length} hạn nộp bài tập / lịch thi!`
            : `AI detected ${items.length} assignments / exam deadlines!`,
          'success'
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(
        (language === 'vi' ? 'Lỗi nhận diện deadline: ' : 'Deadline extraction error: ') +
          (err?.message || (language === 'vi' ? 'Lỗi server' : 'Server error')),
        'error'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImportDetectedDeadlines = () => {
    if (selectedDetectedIndices.length === 0) {
      showToast(
        language === 'vi' ? 'Chưa chọn deadline nào để lưu!' : 'No deadlines selected to save!',
        'warning'
      );
      return;
    }

    let count = 0;
    selectedDetectedIndices.forEach((idx) => {
      const item = detectedDeadlines[idx];
      if (item) {
        addDeadline({
          subjectId: aiSubjectId,
          title: item.title,
          dueDate: item.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          dueTime: item.dueTime || '23:59',
          priority: item.priority || 'medium',
          status: 'todo',
          type: item.type || 'assignment',
          sourceType: 'ai_document',
          sourceText: item.sourceText,
          aiConfidence: item.confidence || 0.9,
          isAiSuggested: false,
          checklist: [
            {
              id: '1',
              text: language === 'vi' ? 'Chuẩn bị yêu cầu đề bài' : 'Prepare assignment requirements',
              done: false,
            },
            {
              id: '2',
              text: language === 'vi' ? 'Hoàn thành và kiểm tra lại' : 'Complete and double-check',
              done: false,
            },
          ],
        });
        count++;
      }
    });

    showToast(
      language === 'vi'
        ? `Đã thêm thành công ${count} deadline vào hệ thống!`
        : `Successfully added ${count} deadlines!`,
      'success'
    );
    setAiModalOpen(false);
    setAiInputText('');
    setDetectedDeadlines([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'vi' ? 'Quản lý Deadline thông minh' : 'Smart Deadline Manager'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              {filteredDeadlines.length} {language === 'vi' ? 'công việc' : 'tasks'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'vi'
              ? 'Tự động trích xuất lịch nộp bài tập từ audio bài giảng và tài liệu thông báo của giảng viên.'
              : 'Automatically extract assignment and exam schedules from lecture audio and instructor announcements.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Recognition Button */}
          <button
            onClick={() => setAiModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition-transform active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>{language === 'vi' ? 'Nhận diện Deadline bằng AI' : 'Extract Deadlines with AI'}</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'vi' ? 'Thêm thủ công' : 'Add Manually'}</span>
          </button>
        </div>
      </div>

      {/* Filter and View Toggles */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'vi' ? 'Tìm deadline...' : 'Search deadlines...'}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="all">{language === 'vi' ? 'Tất cả môn học' : 'All subjects'}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="all">{language === 'vi' ? 'Mọi độ ưu tiên' : 'All priorities'}</option>
            <option value="urgent">{language === 'vi' ? 'Khẩn cấp' : 'Urgent'}</option>
            <option value="high">{language === 'vi' ? 'Ưu tiên cao' : 'High priority'}</option>
            <option value="medium">{language === 'vi' ? 'Trung bình' : 'Medium'}</option>
            <option value="low">{language === 'vi' ? 'Thấp' : 'Low'}</option>
          </select>

          {/* Scope Filter */}
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="all">{language === 'vi' ? 'Cá nhân & Nhóm' : 'Personal & Group'}</option>
            <option value="personal">{language === 'vi' ? 'Chỉ Cá nhân' : 'Personal Only'}</option>
            <option value="group">{language === 'vi' ? 'Chỉ Nhóm học' : 'Study Group Only'}</option>
          </select>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
            title={language === 'vi' ? 'Dạng danh sách' : 'List View'}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'vi' ? 'Danh sách' : 'List'}</span>
          </button>

          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
            title={language === 'vi' ? 'Bảng Kanban' : 'Kanban Board'}
          >
            <Columns className="w-4 h-4" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: LIST VIEW WITH COLOR-CODED URGENCY */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredDeadlines.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CalendarCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                {language === 'vi' ? 'Không có deadline nào phù hợp bộ lọc' : 'No deadlines match your filters'}
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                {language === 'vi'
                  ? 'Dán thông báo lớp học để AI tự động trích xuất deadline, hoặc tạo thủ công.'
                  : 'Paste class announcements for AI to extract deadlines automatically, or create one manually.'}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  {language === 'vi' ? 'Nhận diện bằng AI' : 'Extract with AI'}
                </button>
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  {language === 'vi' ? 'Thêm deadline mới' : 'Add new deadline'}
                </button>
              </div>
            </div>
          ) : (
            filteredDeadlines.map((dl) => {
              const priorityInfo = getPriorityLabel(dl.priority, language);
              const urgency = getDeadlineUrgency(dl.dueDate, dl.status);
              const subject = subjects.find((s) => s.id === dl.subjectId);
              const isCompleted = dl.status === 'completed';

              // Visual Urgency styling
              let urgencyBorder = 'border-slate-200/80 dark:border-slate-800';
              let urgencyBg = 'bg-white dark:bg-slate-900';
              let badgeColor = 'text-slate-500';

              if (urgency === 'overdue') {
                urgencyBorder = 'border-rose-400 dark:border-rose-800/80';
                urgencyBg = 'bg-rose-50/40 dark:bg-rose-950/20';
                badgeColor = 'text-rose-600 dark:text-rose-400 font-extrabold';
              } else if (urgency === 'due_soon') {
                urgencyBorder = 'border-amber-400 dark:border-amber-700/80';
                urgencyBg = 'bg-amber-50/40 dark:bg-amber-950/20';
                badgeColor = 'text-amber-600 dark:text-amber-400 font-extrabold';
              }

              return (
                <div
                  key={dl.id}
                  className={`p-5 rounded-3xl border transition-all ${urgencyBorder} ${urgencyBg}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1">
                      {/* Checkbox toggle status */}
                      <button
                        onClick={() =>
                          handleStatusChange(dl.id, isCompleted ? 'todo' : 'completed')
                        }
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                        title={
                          isCompleted
                            ? language === 'vi'
                              ? 'Đánh dấu chưa hoàn thành'
                              : 'Mark as incomplete'
                            : language === 'vi'
                            ? 'Đánh dấu đã hoàn thành'
                            : 'Mark as completed'
                        }
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-xs"
                            style={{ backgroundColor: subject?.color || '#6366F1' }}
                          >
                            {subject?.code || (language === 'vi' ? 'MÔN' : 'SUB')}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityInfo.bg} ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {getDeadlineTypeLabel(dl.type, language)}
                          </span>
                          {dl.groupId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              <Users className="w-3 h-3" />
                              {language === 'vi' ? 'Nhóm' : 'Group'}
                            </span>
                          )}
                          {dl.sourceType === 'ai_document' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <Sparkles className="w-3 h-3" />
                              {language === 'vi' ? 'AI Trích xuất' : 'AI Extracted'}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-sm font-bold text-slate-900 dark:text-white ${
                            isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}
                        >
                          {dl.title}
                        </h3>

                        {dl.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {dl.description}
                          </p>
                        )}

                        {/* Checklist items */}
                        {dl.checklist && dl.checklist.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 pl-1">
                            {dl.checklist.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => toggleDeadlineChecklistItem(dl.id, item.id)}
                                className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:text-indigo-600"
                              >
                                {item.done ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className={item.done ? 'line-through text-slate-400' : ''}>
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side: Due Date & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2 pl-8 sm:pl-0">
                      <div className="text-right">
                        <div className={`text-xs font-black flex items-center gap-1.5 ${badgeColor}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDateTime(dl.dueDate, dl.dueTime, language)}</span>
                        </div>
                        <div className="text-[10px] font-semibold mt-0.5">
                          {urgency === 'overdue' && (
                            <span className="text-rose-600 dark:text-rose-400">
                              {language === 'vi' ? '⚠️ ĐÃ QUÁ HẠN' : '⚠️ OVERDUE'}
                            </span>
                          )}
                          {urgency === 'due_soon' && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {language === 'vi' ? '⚡ SẮP ĐẾN HẠN (≤ 3 NGÀY)' : '⚡ DUE SOON (≤ 3 DAYS)'}
                            </span>
                          )}
                          {urgency === 'normal' && (
                            <span className="text-slate-400">
                              {language === 'vi' ? 'Đúng tiến độ' : 'On track'}
                            </span>
                          )}
                          {urgency === 'completed' && (
                            <span className="text-emerald-600 font-bold">
                              {language === 'vi' ? '✓ Đã hoàn thành' : '✓ Completed'}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (
                            safeConfirm(
                              language === 'vi'
                                ? 'Bạn có chắc muốn xóa hạn chót này không?'
                                : 'Are you sure you want to delete this deadline?'
                            )
                          ) {
                            deleteDeadline(dl.id);
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title={language === 'vi' ? 'Xóa deadline' : 'Delete deadline'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['todo', 'in_progress', 'completed'] as DeadlineStatus[]).map((colStatus) => {
            const colDeadlines = filteredDeadlines.filter((d) => d.status === colStatus);
            const colLabel = getStatusLabel(colStatus, language);

            return (
              <div
                key={colStatus}
                className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        colStatus === 'completed'
                          ? 'bg-emerald-500'
                          : colStatus === 'in_progress'
                          ? 'bg-sky-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>{colLabel.label}</span>
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {colDeadlines.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {colDeadlines.map((dl) => {
                    const priorityInfo = getPriorityLabel(dl.priority, language);
                    const subject = subjects.find((s) => s.id === dl.subjectId);

                    return (
                      <div
                        key={dl.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[9px] font-black uppercase px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: subject?.color || '#6366F1' }}
                          >
                            {subject?.code || (language === 'vi' ? 'MH' : 'SUB')}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${priorityInfo.bg} ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {dl.title}
                        </h4>

                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                          <span>{formatDate(dl.dueDate, language)}</span>
                          <div className="flex items-center gap-1">
                            {colStatus !== 'completed' && (
                              <button
                                onClick={() => handleStatusChange(dl.id, 'completed')}
                                className="text-[10px] text-emerald-600 font-bold hover:underline"
                              >
                                {language === 'vi' ? 'Xong' : 'Done'}
                              </button>
                            )}
                            {colStatus === 'todo' && (
                              <button
                                onClick={() => handleStatusChange(dl.id, 'in_progress')}
                                className="text-[10px] text-sky-600 font-bold hover:underline"
                              >
                                {language === 'vi' ? 'Bắt đầu' : 'Start'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: AI DEADLINE EXTRACTION ("Nhận thời hạn giao diện bằng AI") */}
      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={language === 'vi' ? 'Nhận diện Deadline thông minh bằng AI' : 'Smart AI Deadline Extraction'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'vi'
              ? 'Dán thông báo lớp học, đề cương bài tập lớn hoặc email từ giảng viên. Gemini AI sẽ tự động phân tích mốc thời gian, mức độ ưu tiên và chuẩn bị lịch cho bạn.'
              : 'Paste class announcements, project syllabi, or emails from your instructor. Gemini AI will automatically parse deadlines, priority levels, and prepare your schedule.'}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Gán vào môn học' : 'Assign to Subject'}
            </label>
            <select
              value={aiSubjectId}
              onChange={(e) => setAiSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Nội dung văn bản / Thông báo bài giảng' : 'Text Content / Class Announcement'}
            </label>
            <textarea
              rows={4}
              value={aiInputText}
              onChange={(e) => setAiInputText(e.target.value)}
              placeholder={
                language === 'vi'
                  ? "Ví dụ: 'Cả lớp chú ý, bài tập thực hành 3 nộp trước 23:59 ngày 30/10/2026. Tuần sau ngày 05/11 sẽ có buổi thuyết trình giữa kỳ tại phòng B2...'"
                  : "e.g. 'Attention class, Lab Assignment 3 is due before 23:59 on Oct 30, 2026. Next week on Nov 5 we will have midterm presentations in Room B2...'"
              }
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y font-mono"
            />
          </div>

          <button
            onClick={handleExtractWithAi}
            disabled={isExtracting || !aiInputText.trim()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isExtracting ? 'animate-spin' : ''}`} />
            <span>
              {isExtracting
                ? language === 'vi'
                  ? 'Gemini AI đang phân tích mốc thời gian...'
                  : 'Gemini AI is analyzing deadlines...'
                : language === 'vi'
                ? 'Phân tích Deadline ngay'
                : 'Analyze Deadlines Now'}
            </span>
          </button>

          {/* Skeleton Loader during AI analysis */}
          {isExtracting && (
            <div className="space-y-3 pt-2">
              <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          )}

          {/* Detected Deadlines List with checkboxes */}
          {detectedDeadlines.length > 0 && !isExtracting && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>
                  {language === 'vi' ? 'Các deadline AI phát hiện được:' : 'Deadlines detected by AI:'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDetectedIndices.length === detectedDeadlines.length) {
                      setSelectedDetectedIndices([]);
                    } else {
                      setSelectedDetectedIndices(detectedDeadlines.map((_, i) => i));
                    }
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {selectedDetectedIndices.length === detectedDeadlines.length
                    ? language === 'vi'
                      ? 'Bỏ chọn tất cả'
                      : 'Deselect all'
                    : language === 'vi'
                    ? 'Chọn tất cả'
                    : 'Select all'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {detectedDeadlines.map((dl, idx) => {
                  const isChecked = selectedDetectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDetectedIndices((prev) =>
                          isChecked ? prev.filter((i) => i !== idx) : [...prev, idx]
                        );
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-colors ${
                        isChecked
                          ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-purple-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{dl.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            {Math.round((dl.confidence || 0.88) * 100)}%{' '}
                            {language === 'vi' ? 'tin cậy' : 'confidence'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
                          <span>
                            📅 {language === 'vi' ? 'Hạn nộp:' : 'Due:'} <strong>{dl.dueDate}</strong>{' '}
                            {dl.dueTime && `(${dl.dueTime})`}
                          </span>
                          <span>•</span>
                          <span>
                            {language === 'vi' ? 'Ưu tiên:' : 'Priority:'}{' '}
                            <strong className="capitalize">{dl.priority}</strong>
                          </span>
                        </div>
                        {dl.sourceText && (
                          <div className="mt-1 text-[10px] italic text-slate-400">
                            "{dl.sourceText}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
                >
                  {language === 'vi' ? 'Đóng' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={handleImportDetectedDeadlines}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20"
                >
                  {language === 'vi'
                    ? `Lưu ${selectedDetectedIndices.length} deadline vào lịch`
                    : `Save ${selectedDetectedIndices.length} deadlines to schedule`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 2: Create / Edit Deadline Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingDl
            ? language === 'vi'
              ? 'Chỉnh sửa deadline'
              : 'Edit Deadline'
            : language === 'vi'
            ? 'Thêm hạn chót mới'
            : 'Add New Deadline'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSaveDeadline} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Tiêu đề công việc' : 'Task Title'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Ví dụ: Nộp bài tập lớn Web Dashboard'
                  : 'e.g. Submit Web Dashboard Final Project'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Môn học' : 'Subject'} <span className="text-red-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Loại công việc' : 'Task Type'}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="assignment">{language === 'vi' ? 'Bài tập về nhà' : 'Homework / Assignment'}</option>
                <option value="exam">{language === 'vi' ? 'Bài kiểm tra / Thi' : 'Quiz / Exam'}</option>
                <option value="project">{language === 'vi' ? 'Đồ án / Dự án' : 'Course Project'}</option>
                <option value="presentation">{language === 'vi' ? 'Thuyết trình' : 'Presentation'}</option>
                <option value="reading">{language === 'vi' ? 'Đọc tài liệu' : 'Reading'}</option>
                <option value="other">{language === 'vi' ? 'Khác' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Ngày đến hạn' : 'Due Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Giờ đến hạn' : 'Due Time'}
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Mức độ ưu tiên' : 'Priority Level'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="low">{language === 'vi' ? 'Thấp' : 'Low'}</option>
                <option value="medium">{language === 'vi' ? 'Trung bình' : 'Medium'}</option>
                <option value="high">{language === 'vi' ? 'Ưu tiên cao' : 'High priority'}</option>
                <option value="urgent">{language === 'vi' ? 'Khẩn cấp' : 'Urgent'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Phân loại' : 'Category'}
              </label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGroup}
                  onChange={(e) => setIsGroup(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {language === 'vi' ? 'Deadline của nhóm học' : 'Study group deadline'}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Ghi chú thêm' : 'Additional Notes'}
            </label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Yêu cầu cụ thể, đường link LMS, lưu ý chấm điểm...'
                  : 'Specific requirements, LMS portal link, grading notes...'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              {language === 'vi' ? 'Lưu deadline' : 'Save Deadline'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
