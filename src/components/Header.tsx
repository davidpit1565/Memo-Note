import React from 'react';
import {
  Menu,
  Plus,
  Search,
  Sparkles,
  Moon,
  Sun,
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { AppLanguage, ThemeMode } from '../types';
import { TRANSLATIONS } from '../lib/i18n';

interface HeaderProps {
  currentView: string;
  language: AppLanguage;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onOpenNewNote: () => void;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
  aiStatus: 'online' | 'analyzing' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  language,
  theme,
  onToggleTheme,
  onToggleLanguage,
  onOpenNewNote,
  onOpenSearch,
  onToggleMobileMenu,
  aiStatus,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#0C0C0C]/80 px-4 md:px-8 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white md:hidden border border-white/10"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#0C0C0C] shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0C0C0C]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-white">
              {t.appName}
            </span>
            <span className="hidden sm:inline text-[9px] uppercase tracking-[0.2em] font-semibold text-white/30">
              Intelligence
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Search quick button with serif styling (tablet & desktop) */}
        <button
          id="header-search-btn"
          onClick={onOpenSearch}
          aria-label={t.search}
          className="hidden sm:flex items-center gap-2.5 h-9 px-4 text-xs text-white/50 bg-white/5 hover:bg-white/10 hover:text-white/80 rounded-full border border-white/10 transition-colors"
        >
          <Search size={13} className="text-white/40" />
          <span className="font-serif italic font-light text-white/60">Search your mind...</span>
          <kbd className="ms-3 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-mono text-white/40">
            /
          </kbd>
        </button>

        {/* AI status indicator (tablet & desktop) */}
        <div
          title={aiStatus === 'online' ? 'Gemini AI Online' : aiStatus === 'analyzing' ? t.analyzing : t.aiOffline}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            aiStatus === 'analyzing'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
              : aiStatus === 'online'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-white/5 text-white/40 border-white/10'
          }`}
        >
          <Sparkles size={11} className={aiStatus === 'analyzing' ? 'animate-spin text-amber-300' : 'text-emerald-400'} />
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            {aiStatus === 'analyzing' ? 'Analyzing' : aiStatus === 'online' ? 'Sync' : 'Offline'}
          </span>
        </div>

        {/* Language switch */}
        <button
          id="lang-toggle-btn"
          onClick={onToggleLanguage}
          aria-label="Switch Language"
          className="flex h-8.5 sm:h-9 items-center gap-1 px-2 sm:px-3 rounded-full text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 border border-white/10 bg-white/5 transition-colors shrink-0"
        >
          <Globe size={12} className="text-white/50" />
          <span className="text-[11px] font-semibold">{language === 'en' ? 'עב' : 'EN'}</span>
        </button>

        {/* Theme toggle (hidden on narrow mobile, available in Settings) */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
          className="hidden xs:flex h-8.5 sm:h-9 w-8.5 sm:w-9 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 border border-white/10 bg-white/5 transition-colors shrink-0"
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* New note button */}
        <button
          id="header-new-note-btn"
          onClick={onOpenNewNote}
          aria-label={t.newNote}
          className="flex h-8.5 sm:h-9 items-center gap-1 sm:gap-1.5 rounded-full bg-white px-2.5 sm:px-4 text-xs font-bold text-[#0C0C0C] shadow-lg hover:opacity-90 transition-all cursor-pointer shrink-0"
        >
          <Plus size={13} strokeWidth={2.5} />
          <span className="hidden sm:inline">{t.newNote}</span>
          <span className="sm:hidden text-[11px]">Note</span>
        </button>
      </div>
    </header>
  );
};
