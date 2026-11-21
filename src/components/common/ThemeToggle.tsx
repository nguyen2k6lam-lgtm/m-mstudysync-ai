import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, language } = useApp();

  const toggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
      title={
        language === 'vi'
          ? `Chuyển sang chế độ ${theme === 'dark' ? 'sáng' : 'tối'}`
          : `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
      }
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-600" />
      )}
    </button>
  );
};
