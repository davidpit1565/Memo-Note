import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  CheckSquare,
  MessageSquare,
  Search,
  Calendar,
  Archive,
  Trash2,
  Settings,
  Folder as FolderIcon,
  Tag as TagIcon,
  Plus,
  ChevronRight,
  X,
  Clock
} from 'lucide-react';
import type { AppLanguage, Folder, Tag } from '../types';
import { TRANSLATIONS } from '../lib/i18n';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string, filter?: { folderId?: string; tagId?: string }) => void;
  language: AppLanguage;
  pendingTasksCount: number;
  totalNotesCount: number;
  folders: Folder[];
  tags: Tag[];
  onCreateFolder: (name: string) => void;
  onCreateTag: (name: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  language,
  pendingTasksCount,
  totalNotesCount,
  folders,
  tags,
  onCreateFolder,
  onCreateTag,
  isOpenMobile,
  onCloseMobile,
}) => {
  const t = TRANSLATIONS[language];
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const navItems = [
    { id: 'home', label: t.capture, icon: Sparkles, badge: null },
    { id: 'notes', label: t.memory, icon: FileText, badge: totalNotesCount },
    { id: 'tasks', label: t.tasks, icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'ask', label: t.askMemo, icon: MessageSquare, badge: null },
    { id: 'brief', label: t.dailyBrief, icon: Calendar, badge: null },
    { id: 'search', label: t.search, icon: Search, badge: null },
  ];

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim().toLowerCase().replace(/^#/, ''));
      setNewTagName('');
      setIsCreatingTag(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 z-50 flex w-72 flex-col justify-between border-e border-white/10 bg-[#0C0C0C] p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-transform duration-200 md:static md:w-64 md:translate-x-0 md:pt-4 md:pb-4 ${
          isOpenMobile
            ? 'translate-x-0'
            : '-translate-x-full rtl:translate-x-full md:rtl:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-5 overflow-y-auto">
          {/* Mobile header with close button */}
          <div className="flex items-center justify-between md:hidden pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
              <span className="text-sm font-bold text-white tracking-tight">{t.appName}</span>
            </div>
            <button
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="p-2 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold px-3 mb-1">
              Library
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => {
                    onSelectView(item.id);
                    onCloseMobile();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold border border-white/10 shadow-sm'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isActive ? 'text-white' : 'text-white/50'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white text-[#0C0C0C]'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Folders Section */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
              <span>{t.folders}</span>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                title="Create folder"
              >
                <Plus size={13} />
              </button>
            </div>

            {isCreatingFolder && (
              <form onSubmit={handleAddFolder} className="px-2 py-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => {
                    if (!newFolderName.trim()) setIsCreatingFolder(false);
                  }}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                />
              </form>
            )}

            <div className="flex flex-col gap-0.5">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    onSelectView('notes', { folderId: folder.id });
                    onCloseMobile();
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FolderIcon size={14} className="text-white/40" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
              {folders.length === 0 && !isCreatingFolder && (
                <span className="px-3.5 py-1.5 text-[11px] text-white/30 italic">No folders</span>
              )}
            </div>
          </div>

          {/* Tags Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
              <span>{t.tags}</span>
              <button
                onClick={() => setIsCreatingTag(true)}
                className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                title="Create tag"
              >
                <Plus size={13} />
              </button>
            </div>

            {isCreatingTag && (
              <form onSubmit={handleAddTag} className="px-2 py-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="Tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onBlur={() => {
                    if (!newTagName.trim()) setIsCreatingTag(false);
                  }}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                />
              </form>
            )}

            <div className="flex flex-wrap gap-1.5 px-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onSelectView('notes', { tagId: tag.name });
                    onCloseMobile();
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span>#{tag.name}</span>
                </button>
              ))}
              {tags.length === 0 && !isCreatingTag && (
                <span className="px-2 py-1 text-[11px] text-white/30 italic">No tags</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Utility Items & Profile */}
        <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
          <button
            id="nav-archive"
            onClick={() => {
              onSelectView('archive');
              onCloseMobile();
            }}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
              currentView === 'archive'
                ? 'bg-white/10 text-white font-semibold border border-white/10'
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Archive size={14} className="text-white/40" />
            <span>{t.archive}</span>
          </button>

          <button
            id="nav-trash"
            onClick={() => {
              onSelectView('trash');
              onCloseMobile();
            }}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
              currentView === 'trash'
                ? 'bg-white/10 text-white font-semibold border border-white/10'
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Trash2 size={14} className="text-white/40" />
            <span>{t.trash}</span>
          </button>

          <button
            id="nav-settings"
            onClick={() => {
              onSelectView('settings');
              onCloseMobile();
            }}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-white/10 text-white font-semibold border border-white/10'
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings size={14} className="text-white/40" />
            <span>{t.settings}</span>
          </button>

          {/* Workspace Status Card */}
          <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
              M
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-medium text-white truncate">Local Vault</span>
              <span className="text-[10px] text-white/40 truncate">Private • IndexedDB</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
