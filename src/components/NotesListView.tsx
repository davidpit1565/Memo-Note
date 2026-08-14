import React, { useState } from 'react';
import {
  FileText,
  Pin,
  Archive,
  Trash2,
  Tag as TagIcon,
  Folder as FolderIcon,
  CheckSquare,
  Sparkles,
  Calendar,
  RotateCcw,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import type { Note, Folder, Tag, AppLanguage } from '../types';
import { TRANSLATIONS } from '../lib/i18n';

interface NotesListViewProps {
  viewType: 'notes' | 'archive' | 'trash';
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  language: AppLanguage;
  activeFilter?: { folderId?: string; tagId?: string };
  onOpenNote: (noteId: number) => void;
  onTogglePin: (noteId: number, isPinned: boolean) => void;
  onArchive: (noteId: number) => void;
  onTrash: (noteId: number) => void;
  onRestore: (noteId: number) => void;
  onPermanentDelete: (noteId: number) => void;
  onEmptyTrash?: () => void;
  onNavigateToCapture?: () => void;
}

export const NotesListView: React.FC<NotesListViewProps> = ({
  viewType,
  notes,
  folders,
  tags,
  language,
  activeFilter,
  onOpenNote,
  onTogglePin,
  onArchive,
  onTrash,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  onNavigateToCapture,
}) => {
  const t = TRANSLATIONS[language];
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // Filter notes based on viewType & activeFilter
  const displayNotes = notes.filter((n) => {
    if (viewType === 'trash') {
      return n.isDeleted;
    }
    if (n.isDeleted) return false;

    if (viewType === 'archive') {
      return n.isArchived;
    }
    if (n.isArchived) return false;

    // View is 'notes'
    if (activeFilter?.folderId && n.folderId !== activeFilter.folderId) return false;
    if (activeFilter?.tagId && (!n.tagIds || !n.tagIds.includes(activeFilter.tagId))) return false;

    return true;
  });

  // Sort: pinned first, then by updatedAt desc
  displayNotes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
  });

  const getFolder = (folderId?: string) => folders.find((f) => f.id === folderId);

  const getTitle = () => {
    if (viewType === 'archive') return t.archive;
    if (viewType === 'trash') return t.trash;
    if (activeFilter?.folderId) {
      const f = getFolder(activeFilter.folderId);
      return f ? `Folder: ${f.name}` : t.allNotes;
    }
    if (activeFilter?.tagId) {
      return `Tag: #${activeFilter.tagId}`;
    }
    return t.allNotes;
  };

  return (
    <div className="flex flex-col max-w-6xl mx-auto w-full py-6 px-4 md:px-8 gap-6 text-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight font-serif italic text-white/95">
            {getTitle()}
          </h1>
          <p className="text-xs text-white/40 mt-0.5">{displayNotes.length} notes stored locally</p>
        </div>

        <div className="flex items-center gap-2.5">
          {viewType === 'trash' && displayNotes.length > 0 && onEmptyTrash && (
            <button
              onClick={onEmptyTrash}
              className="px-3.5 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-semibold hover:bg-red-500/20 transition-colors"
            >
              {t.clearTrash}
            </button>
          )}

          {/* Grid / List switch */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
            <button
              onClick={() => setLayout('grid')}
              className={`p-1.5 rounded-full transition-colors ${
                layout === 'grid' ? 'bg-white text-[#0C0C0C]' : 'text-white/40 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`p-1.5 rounded-full transition-colors ${
                layout === 'list' ? 'bg-white text-[#0C0C0C]' : 'text-white/40 hover:text-white'
              }`}
              title="List View"
            >
              <ListIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Note Cards */}
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-3'
        }
      >
        {displayNotes.map((note) => {
          const folder = getFolder(note.folderId);
          const hasInsights = note.aiInsights && (note.aiInsights.tasks.length > 0 || note.aiInsights.summary);

          return (
            <div
              key={note.id}
              onClick={() => viewType !== 'trash' && onOpenNote(note.id!)}
              className={`group relative flex flex-col justify-between rounded-3xl border transition-all ${
                viewType !== 'trash' ? 'cursor-pointer hover:border-white/20 hover:bg-white/10 hover:shadow-lg' : ''
              } ${
                note.isPinned
                  ? 'border-amber-400/30 bg-amber-500/5'
                  : 'border-white/10 bg-white/5'
              } p-5 backdrop-blur-sm`}
            >
              <div className="flex flex-col gap-2.5">
                {/* Card Top Row: Title & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif italic text-base text-white/95 line-clamp-1 font-normal">
                    {note.title || 'Untitled Note'}
                  </h3>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {viewType !== 'trash' && (
                      <button
                        onClick={() => onTogglePin(note.id!, !note.isPinned)}
                        className={`p-2 min-w-[32px] min-h-[32px] rounded-full transition-colors cursor-pointer ${
                          note.isPinned
                            ? 'text-amber-400 bg-amber-400/10'
                            : 'text-white/30 hover:text-white hover:bg-white/10'
                        }`}
                        title={note.isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin size={13} className={note.isPinned ? 'fill-current' : ''} />
                      </button>
                    )}

                    {viewType === 'trash' ? (
                      <>
                        <button
                          onClick={() => onRestore(note.id!)}
                          className="p-2 min-w-[32px] min-h-[32px] rounded-full text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title={t.restoreNote}
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          onClick={() => onPermanentDelete(note.id!)}
                          className="p-2 min-w-[32px] min-h-[32px] rounded-full text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title={t.permanentDelete}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onArchive(note.id!)}
                          className="p-2 min-w-[32px] min-h-[32px] rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title={t.archive}
                        >
                          <Archive size={13} />
                        </button>
                        <button
                          onClick={() => onTrash(note.id!)}
                          className="p-2 min-w-[32px] min-h-[32px] rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title={t.trash}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content snippet */}
                <p className="text-xs text-white/60 line-clamp-3 leading-relaxed font-light">
                  {note.summary || note.plainText || 'No additional text'}
                </p>

                {/* AI Insights badges */}
                {hasInsights && (
                  <div className="flex items-center gap-2 pt-1">
                    {note.aiInsights?.tasks && note.aiInsights.tasks.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-medium">
                        <CheckSquare size={10} />
                        <span>{note.aiInsights.tasks.length} tasks</span>
                      </span>
                    )}
                    {note.aiInsights?.people && note.aiInsights.people.length > 0 && (
                      <span className="text-[10px] text-purple-300 bg-purple-400/10 px-2 py-0.5 rounded-full border border-purple-400/20 font-medium">
                        {note.aiInsights.people.length} people
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5 text-[10px] text-white/40">
                <div className="flex items-center gap-1.5">
                  {folder && (
                    <span className="inline-flex items-center gap-1 text-white/60">
                      <FolderIcon size={10} />
                      <span>{folder.name}</span>
                    </span>
                  )}
                  {note.tagIds?.slice(0, 2).map((tag) => (
                    <span key={tag} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/60">
                      #{tag}
                    </span>
                  ))}
                </div>

                <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}

        {displayNotes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-3">
            <FileText size={36} strokeWidth={1.2} className="text-white/20" />
            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-serif italic text-white/90">
                {t.emptyMemoryHeading}
              </h3>
              <p className="text-xs sm:text-sm text-white/40 font-light leading-relaxed">
                {t.emptyMemorySub}
              </p>
            </div>
            {onNavigateToCapture && (
              <button
                onClick={onNavigateToCapture}
                className="mt-2 rounded-full bg-white px-5 py-2 text-xs font-bold text-[#0C0C0C] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                {t.captureThoughtBtn}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
