import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { formatDate } from '../../utils/formatters';
import {
  Users,
  Plus,
  UserPlus,
  Copy,
  Check,
  Shield,
  Trash2,
  LogOut,
  CalendarCheck,
  Share2,
  Crown,
} from 'lucide-react';

interface StudyGroupViewProps {
  filterSubjectId?: string;
}

export const StudyGroupView: React.FC<StudyGroupViewProps> = ({ filterSubjectId }) => {
  const {
    currentUser,
    studyGroups,
    groupMembers,
    subjects,
    activeSubjectId,
    deadlines,
    createStudyGroup,
    joinStudyGroup,
    leaveStudyGroup,
    deleteStudyGroup,
    showToast,
    language,
  } = useApp();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<any | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSubjectId, setGroupSubjectId] = useState(
    filterSubjectId || activeSubjectId || (subjects[0]?.id || '')
  );
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredGroups = studyGroups.filter(
    (g) => !filterSubjectId || g.subjectId === filterSubjectId
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(
      language === 'vi'
        ? `Đã sao chép mã mời nhóm "${code}"!`
        : `Copied group invite code "${code}"!`,
      'success'
    );
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showToast(
        language === 'vi' ? 'Vui lòng nhập tên nhóm học!' : 'Please enter a study group name!',
        'error'
      );
      return;
    }
    createStudyGroup(groupName.trim(), groupDesc.trim(), groupSubjectId);
    setCreateModalOpen(false);
    setGroupName('');
    setGroupDesc('');
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      showToast(
        language === 'vi' ? 'Vui lòng nhập mã mời!' : 'Please enter an invite code!',
        'error'
      );
      return;
    }
    const ok = joinStudyGroup(inviteCodeInput.trim());
    if (ok) {
      setJoinModalOpen(false);
      setInviteCodeInput('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'vi' ? 'Nhóm học tập & Đồ án' : 'Study Groups & Projects'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              {filteredGroups.length} {language === 'vi' ? 'nhóm' : 'groups'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'vi'
              ? 'Cùng làm bài tập lớn, phân chia deadline và theo dõi tiến độ chung của các thành viên.'
              : 'Collaborate on projects, share deadlines, and track progress across team members.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setJoinModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <UserPlus className="w-4 h-4 text-purple-600" />
            <span>{language === 'vi' ? 'Nhập mã tham gia' : 'Join with Code'}</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'vi' ? 'Tạo nhóm mới' : 'Create Group'}</span>
          </button>
        </div>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            {language === 'vi' ? 'Bạn chưa tham gia nhóm học nào' : 'You have not joined any study groups yet'}
          </h4>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            {language === 'vi'
              ? 'Tạo nhóm học tập để cùng các bạn chia sẻ deadline đồ án và bài học chung.'
              : 'Create a study group to share project deadlines and study materials with classmates.'}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            {language === 'vi' ? 'Tạo nhóm học ngay' : 'Create Study Group Now'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGroups.map((grp) => {
            const subject = subjects.find((s) => s.id === grp.subjectId);
            const members = groupMembers.filter((m) => m.groupId === grp.id);
            const isOwner = grp.ownerId === currentUser?.id;
            const userMember = members.find((m) => m.userId === currentUser?.id);
            const canDelete = isOwner || userMember?.role === 'owner' || userMember?.role === 'admin';
            const groupDeadlines = deadlines.filter((d) => d.groupId === grp.id);

            return (
              <div
                key={grp.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: subject?.color || '#6366F1' }}
                    >
                      {subject?.name || (language === 'vi' ? 'Môn học' : 'Subject')}
                    </span>

                    {/* Invite Code Badge */}
                    <button
                      onClick={() => handleCopyCode(grp.inviteCode)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                      title={language === 'vi' ? 'Nhấn để sao chép mã mời' : 'Click to copy invite code'}
                    >
                      {copiedCode === grp.inviteCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{grp.inviteCode}</span>
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {grp.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {grp.description || (language === 'vi' ? 'Chưa có mô tả cho nhóm học.' : 'No description provided.')}
                  </p>

                  {/* Members Avatars List */}
                  <div className="space-y-2 mb-4">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{language === 'vi' ? 'Thành viên' : 'Members'} ({members.length})</span>
                    </div>

                    <div className="space-y-1.5">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                              {m.fullName.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {m.fullName}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              m.role === 'owner'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : m.role === 'admin'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {m.role === 'owner'
                              ? language === 'vi' ? 'Trưởng nhóm' : 'Owner'
                              : m.role === 'admin'
                              ? language === 'vi' ? 'Quản trị viên' : 'Admin'
                              : language === 'vi' ? 'Thành viên' : 'Member'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group Deadlines count */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
                    <CalendarCheck className="w-4 h-4 text-indigo-500" />
                    <span>
                      {groupDeadlines.length}{' '}
                      {language === 'vi' ? 'deadline chung của nhóm' : 'shared group deadlines'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {language === 'vi' ? 'Tạo ngày' : 'Created'} {formatDate(grp.createdAt, language)}
                  </span>

                  {canDelete ? (
                    <button
                      onClick={() => setDeletingGroup(grp)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 font-bold hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'vi' ? 'Xóa nhóm' : 'Delete group'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => leaveStudyGroup(grp.id)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 font-bold hover:text-rose-600"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'vi' ? 'Rời nhóm' : 'Leave group'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={language === 'vi' ? 'Tạo nhóm học tập mới' : 'Create New Study Group'}
        maxWidth="md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Tên nhóm học / Đồ án' : 'Group / Project Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={language === 'vi' ? 'Ví dụ: Nhóm 03 - Đồ án Web K65' : 'e.g. Team 03 - Web Project K65'}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Môn học áp dụng' : 'Subject'}
            </label>
            <select
              value={groupSubjectId}
              onChange={(e) => setGroupSubjectId(e.target.value)}
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
              {language === 'vi' ? 'Mô tả nhiệm vụ của nhóm' : 'Group Mission / Description'}
            </label>
            <textarea
              rows={3}
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Phân công công việc, mục tiêu đạt điểm A+, link drive nhóm...'
                  : 'Task assignments, A+ grade goals, shared Drive link...'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              {language === 'vi' ? 'Tạo nhóm ngay' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title={language === 'vi' ? 'Tham gia nhóm bằng mã mời' : 'Join Group with Invite Code'}
        maxWidth="sm"
      >
        <form onSubmit={handleJoinSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Nhập mã mời nhóm' : 'Enter Group Invite Code'}
            </label>
            <input
              type="text"
              required
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              placeholder={language === 'vi' ? 'Ví dụ: SMIND-WEB65' : 'e.g. SMIND-WEB65'}
              className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {language === 'vi'
                ? 'Hỏi bạn cùng nhóm mã mời bắt đầu bằng "SMIND-..." để tham gia.'
                : 'Ask a group mate for the invite code starting with "SMIND-..." to join.'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setJoinModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              {language === 'vi' ? 'Tham gia nhóm' : 'Join Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Group Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingGroup}
        onClose={() => setDeletingGroup(null)}
        onConfirm={async () => {
          if (deletingGroup) {
            deleteStudyGroup(deletingGroup.id);
            setDeletingGroup(null);
          }
        }}
        title={language === 'vi' ? 'Xác nhận xóa nhóm học' : 'Confirm Delete Study Group'}
        message={
          language === 'vi'
            ? 'Bạn có chắc chắn muốn xóa nội dung này không? Hành động này không thể hoàn tác.'
            : 'Are you sure you want to delete this item? This action cannot be undone.'
        }
        warningNote={
          language === 'vi'
            ? 'Toàn bộ dữ liệu nhóm, danh sách thành viên và các deadline chung của nhóm sẽ bị xóa khỏi hệ thống.'
            : 'All group data, member lists, and shared group deadlines will be permanently deleted.'
        }
        itemTitle={deletingGroup?.name}
        confirmText={language === 'vi' ? 'Xóa nhóm' : 'Delete group'}
        cancelText={language === 'vi' ? 'Hủy' : 'Cancel'}
      />
    </div>
  );
};
