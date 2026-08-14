import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  Tag as TagIcon,
  Folder as FolderIcon
} from 'lucide-react';
import type { Note, Folder, Tag, AppLanguage } from '../types';
import { TRANSLATIONS } from '../lib/i18n';
import { weightedLocalRetrieval, type ScoredNote } from '../lib/retrieval';

interface SearchViewProps {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  language: AppLanguage;
  onOpenNote: (noteId: number) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  notes,
  folders,
  tags,
  language,
  onOpenNote,
}) => {
  const t = TRANSLATIONS[language];
  const [query, setQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    let pool = notes.filter((n) => !n.isDeleted && !n.isArchived);

    if (selectedFolder !== 'all') {
      pool = pool.filter((n) => n.folderId === selectedFolder);
    }
    if (selectedTag !== 'all') {
      pool = pool.filter((n) => n.tagIds && n.tagIds.includes(selectedTag));
    }

    return weightedLocalRetrieval(pool, query, { maxResults: 20, minScore: 0.2 });
  }, [notes, query, selectedFolder, selectedTag]);

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full py-6 px-4 md:px-6 gap-6 text-white">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight font-serif italic text-white/95">
          {t.search}
        </h1>
        <p className="text-xs sm:text-sm text-white/50 font-light mt-1">
          {t.emptySearchSub}
        </p>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search size={18} className="absolute start-4 text-white/40" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.emptySearch}
          className="w-full rounded-full border border-white/15 bg-white/5 py-3.5 ps-11 pe-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 shadow-lg backdrop-blur-md font-light"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute end-3.5 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Search Filters Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
          <FolderIcon size={12} className="text-white/40" />
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="bg-transparent text-xs text-white/80 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0C0C0C]">
              {language === 'he' ? 'כל התיקיות' : 'All Folders'}
            </option>
            {folders.map((f) => (
              <option key={f.id} value={f.id} className="bg-[#0C0C0C]">
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
          <TagIcon size={12} className="text-white/40" />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-transparent text-xs text-white/80 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0C0C0C]">
              {language === 'he' ? 'כל התגיות' : 'All Tags'}
            </option>
            {tags.map((tg) => (
              <option key={tg.id} value={tg.name} className="bg-[#0C0C0C]">
                #{tg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="flex flex-col gap-3">
        {searchResults.map(({ note, matchedTerms }) => (
          <div
            key={note.id}
            onClick={() => onOpenNote(note.id!)}
            className="flex flex-col gap-2 p-5 rounded-3xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 cursor-pointer shadow-sm backdrop-blur-md transition-all"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif italic text-base text-white/95">
                {note.title || 'Untitled Note'}
              </h3>
              <span className="text-[10px] text-white/40">
                {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-xs text-white/70 line-clamp-2 leading-relaxed font-light">
              {note.summary || note.plainText}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="text-white/40">Matches:</span>
                {matchedTerms.map((term) => (
                  <span key={term} className="bg-white/10 text-white/90 border border-white/10 px-2 py-0.5 rounded-full text-[10px]">
                    {term}
                  </span>
                ))}
              </div>

              {note.tagIds && note.tagIds.length > 0 && (
                <div className="flex items-center gap-1 text-white/40">
                  {note.tagIds.map((t) => (
                    <span key={t} className="bg-white/5 px-2 py-0.5 rounded-full">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {query.trim() && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-white/30 gap-2">
            <Search size={32} strokeWidth={1.2} className="text-white/20" />
            <p className="text-sm font-light">
              {language === 'he' ? `לא נמצאו תוצאות עבור "${query}"` : `No matching notes found for "${query}"`}
            </p>
          </div>
        )}

        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Search size={36} strokeWidth={1.2} className="text-white/20" />
            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-serif italic text-white/90">
                {t.emptySearchHeading}
              </h3>
              <p className="text-xs sm:text-sm text-white/40 font-light leading-relaxed">
                {t.emptySearchSub}
              </p>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-sm mt-3">
                {tags.slice(0, 6).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setQuery(tag.name)}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
