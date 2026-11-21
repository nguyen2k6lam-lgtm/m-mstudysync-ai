import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Globe, Check, ChevronDown } from 'lucide-react';

export const LanguageToggle: React.FC<{ variant?: 'navbar' | 'compact' | 'full' }> = ({
  variant = 'navbar',
}) => {
  const { language, setLanguage, toggleLanguage, t } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutHint = isMac ? '⌘ + Shift + L' : 'Ctrl + Shift + L';

  if (variant === 'full') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLanguage('vi')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
            language === 'vi'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
          }`}
        >
          <span className="text-sm">🇻🇳</span>
          <span>Tiếng Việt</span>
          {language === 'vi' && <Check className="w-3.5 h-3.5 ml-1" />}
        </button>

        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
            language === 'en'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
          }`}
        >
          <span className="text-sm">🇬🇧</span>
          <span>English</span>
          {language === 'en' && <Check className="w-3.5 h-3.5 ml-1" />}
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700/70 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group">
        <button
          type="button"
          onClick={() => toggleLanguage()}
          onContextMenu={(e) => {
            e.preventDefault();
            setDropdownOpen(!dropdownOpen);
          }}
          title={`${t.languageShortcutTooltip} [${shortcutHint}]`}
          aria-label={`${t.selectLanguage} (${shortcutHint})`}
          className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-45 transition-transform" />
          <span className="font-bold uppercase tracking-wider text-[11px]">
            {language === 'vi' ? 'VI' : 'EN'}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
          className="pr-2 pl-0.5 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          title={t.selectLanguage}
          aria-label={t.selectLanguage}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown for explicit selection */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            <span>{t.selectLanguage}</span>
            <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-500">
              {shortcutHint}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setLanguage('vi');
              setDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              language === 'vi'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🇻🇳</span>
              <span>Tiếng Việt</span>
            </span>
            {language === 'vi' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              setDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              language === 'en'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🇬🇧</span>
              <span>English</span>
            </span>
            {language === 'en' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
          </button>
        </div>
      )}
    </div>
  );
};
