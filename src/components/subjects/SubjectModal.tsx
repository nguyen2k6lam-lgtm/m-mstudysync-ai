import React, { useState, useEffect } from 'react';
import { Subject } from '../../types';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    code: string;
    description: string;
    color: string;
    lecturer?: string;
    schedule?: string;
  }) => void;
  initialData?: Subject | null;
}

const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t, language } = useApp();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [lecturer, setLecturer] = useState('');
  const [schedule, setSchedule] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setDescription(initialData.description || '');
      setColor(initialData.color || COLOR_PALETTE[0]);
      setLecturer(initialData.lecturer || '');
      setSchedule(initialData.schedule || '');
    } else {
      setName('');
      setCode('');
      setDescription('');
      setColor(COLOR_PALETTE[0]);
      setLecturer('');
      setSchedule('');
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(language === 'vi' ? 'Tên môn học không được để trống.' : 'Course name cannot be empty.');
      return;
    }
    onSubmit({
      name: name.trim(),
      code: code.trim() || 'MH01',
      description: description.trim(),
      color,
      lecturer: lecturer.trim(),
      schedule: schedule.trim(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? (language === 'vi' ? 'Chỉnh sửa môn học' : 'Edit Course') : t.addCourseBtn}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {t.courseNameLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={language === 'vi' ? 'Ví dụ: Lập trình Web nâng cao' : 'e.g., Advanced Web Development'}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.courseCodeLabel}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS301"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.lecturerLabel}
            </label>
            <input
              type="text"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              placeholder={language === 'vi' ? 'TS. Trần Văn Nam' : 'Prof. John Smith'}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {t.scheduleLabel}
          </label>
          <input
            type="text"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder={language === 'vi' ? 'Ví dụ: Thứ 3 (07:30 - 11:00) tại Phòng B2-304' : 'e.g., Tue (07:30 - 11:00) Room B2-304'}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {t.courseColorLabel}
          </label>
          <div className="flex items-center gap-2.5 pt-1">
            {COLOR_PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-125 border-slate-900 dark:border-white shadow-md' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {t.courseDescriptionLabel}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={language === 'vi' ? 'Mô tả nội dung môn học, giáo trình hoặc mục tiêu...' : 'Course syllabus, objectives, or target grades...'}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
          >
            {initialData ? t.update : t.save}
          </button>
        </div>
      </form>
    </Modal>
  );
};
