import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, language } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let bg = 'bg-blue-600 text-white dark:bg-blue-600';
        if (toast.type === 'success') {
          Icon = CheckCircle2;
          bg = 'bg-emerald-600 text-white dark:bg-emerald-600';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          bg = 'bg-rose-600 text-white dark:bg-rose-600';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          bg = 'bg-amber-600 text-white dark:bg-amber-600';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl backdrop-blur-sm transition-all duration-300 transform translate-y-0 ${bg}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium leading-snug">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 -mr-1 -mt-1 rounded-lg opacity-75 hover:opacity-100 hover:bg-black/10 transition-opacity"
              title={language === 'vi' ? 'Đóng thông báo' : 'Dismiss notification'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
