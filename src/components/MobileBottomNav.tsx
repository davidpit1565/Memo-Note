import React from 'react';
import {
  Sparkles,
  FileText,
  CheckSquare,
  MessageSquare,
  Search,
  Menu
} from 'lucide-react';
import type { AppLanguage } from '../types';
import { TRANSLATIONS } from '../lib/i18n';

interface MobileBottomNavProps {
  currentView: string;
  onSelectView: (view: string) => void;
  language: AppLanguage;
  pendingTasksCount: number;
  totalNotesCount: number;
  onOpenMobileDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  language,
  pendingTasksCount,
  totalNotesCount,
  onOpenMobileDrawer,
}) => {
  const t = TRANSLATIONS[language];

  const tabs = [
    { id: 'home', label: t.capture, icon: Sparkles, badge: null },
    { id: 'notes', label: t.memory, icon: FileText, badge: totalNotesCount > 0 ? totalNotesCount : null },
    { id: 'tasks', label: t.tasks, icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'ask', label: t.askMemo, icon: MessageSquare, badge: null },
    { id: 'search', label: t.search, icon: Search, badge: null },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0C0C0C]/95 backdrop-blur-xl px-1 xs:px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all select-none"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;

          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => onSelectView(tab.id)}
              aria-label={tab.label}
              className={`relative flex flex-col items-center justify-center py-1 px-1 xs:px-2.5 rounded-2xl min-w-[46px] xs:min-w-[54px] min-h-[48px] transition-all touch-manipulation cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/80 active:scale-95'
              }`}
            >
              {/* Active pill background */}
              {isActive && (
                <span className="absolute inset-0.5 rounded-xl bg-white/10 border border-white/15 -z-10" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  size={18}
                  className={`transition-transform ${isActive ? 'scale-110 text-white' : 'text-white/50'}`}
                />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -end-2.5 flex h-4 min-w-[15px] items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-[#0C0C0C] shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-1 font-medium leading-none ${isActive ? 'text-white font-semibold' : 'text-white/50'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More Menu Trigger for Folders, Brief, Archive, Settings */}
        <button
          id="mobile-tab-more"
          onClick={onOpenMobileDrawer}
          aria-label="More navigation and folders"
          className="relative flex flex-col items-center justify-center py-1 px-1 xs:px-2.5 rounded-2xl min-w-[46px] xs:min-w-[54px] min-h-[48px] text-white/40 hover:text-white/80 active:scale-95 transition-all touch-manipulation cursor-pointer"
        >
          <Menu size={18} className="text-white/50" />
          <span className="text-[10px] tracking-tight mt-1 font-medium text-white/50 leading-none">
            {language === 'he' ? 'עוד' : 'More'}
          </span>
        </button>
      </div>
    </nav>
  );
};
