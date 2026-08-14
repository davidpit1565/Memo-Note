import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  Save,
  Trash2,
  Archive,
  Tag as TagIcon,
  Folder as FolderIcon,
  Paperclip,
  X,
  Check,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Layers,
  Wand2,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import type { Note, Folder, Tag, AppLanguage, AIInsight, NoteTask, NoteAttachment } from '../types';
import { TRANSLATIONS, detectContentLanguage, isRTL } from '../lib/i18n';
import { AISuggestionPanel } from './AISuggestionPanel';
import { AIService } from '../lib/ai-service';
import { hashContent } from '../lib/hash';

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  tags: Tag[];
  language: AppLanguage;
  onSave: (updatedNote: Partial<Note>, triggerAI?: boolean) => Promise<Note>;
  onDelete: (noteId: number) => void;
  onArchive: (noteId: number) => void;
  onClose: () => void;
  onAddTask: (task: { title: string; dueDate?: string; priority: 'low' | 'medium' | 'high'; noteId?: number }) => Promise<void>;
  allNotes: Note[];
  onOpenNote: (noteId: number) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  tags,
  language,
  onSave,
  onDelete,
  onArchive,
  onClose,
  onAddTask,
  allNotes,
  onOpenNote,
}) => {
  const t = TRANSLATIONS[language];
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [tagIds, setTagIds] = useState<string[]>(note.tagIds || []);
  const [folderId, setFolderId] = useState<string | undefined>(note.folderId);
  const [isPinned, setIsPinned] = useState(note.isPinned || false);
  const [isSaved, setIsSaved] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(note.aiStatus === 'analyzing');
  const [aiInsights, setAiInsights] = useState<AIInsight | undefined>(note.aiInsights);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showMobileAISheet, setShowMobileAISheet] = useState(false);
  const [attachments, setAttachments] = useState<NoteAttachment[]>(note.attachments || []);
  const [relatedNotes, setRelatedNotes] = useState<Array<{ note: Note; reason: string }>>([]);

  // AI Command Dialog state (Cmd+K)
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [customCommandPrompt, setCustomCommandPrompt] = useState('');
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandPreview, setCommandPreview] = useState<{ original: string; suggested: string; explanation?: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const lastAnalyzedHash = useRef<string>(note.contentHash || '');

  // Direction of the note content
  const contentLang = detectContentLanguage(`${title} ${content}`);
  const isContentRTL = isRTL(contentLang);

  // Sync state when note prop changes
  useEffect(() => {
    setTitle(note.title || '');
    setContent(note.content || '');
    setTagIds(note.tagIds || []);
    setFolderId(note.folderId);
    setIsPinned(note.isPinned || false);
    setAiInsights(note.aiInsights);
    setAttachments(note.attachments || []);
    lastAnalyzedHash.current = note.contentHash || '';
    findRelated();
  }, [note.id]);

  // Related notes finder
  const findRelated = async () => {
    if (!note.id || allNotes.length <= 1) return;
    const candidates = allNotes.filter((n) => n.id !== note.id && !n.isDeleted);
    const res = await AIService.findRelatedNotes(note, candidates);
    if (res.related && res.related.length > 0) {
      const mapped = res.related
        .map((r) => {
          const matchedNote = candidates.find((c) => c.id === r.id);
          return matchedNote ? { note: matchedNote, reason: r.reason } : null;
        })
        .filter(Boolean) as Array<{ note: Note; reason: string }>;
      setRelatedNotes(mapped);
    }
  };

  // Real-time autosave
  const triggerAutosave = (newTitle: string, newContent: string, newTags: string[], newFolder?: string) => {
    setIsSaved(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      const currentHash = hashContent(newContent);
      const shouldRunAI = newContent.length >= 15 && currentHash !== lastAnalyzedHash.current;

      const updated = await onSave(
        {
          id: note.id,
          title: newTitle,
          content: newContent,
          plainText: newContent,
          tagIds: newTags,
          folderId: newFolder,
          isPinned,
          updatedAt: Date.now(),
          language: contentLang,
        },
        shouldRunAI
      );

      setIsSaved(true);
      if (shouldRunAI) {
        lastAnalyzedHash.current = currentHash;
        setIsAnalyzing(true);
        // Fetch fresh insights after async AI completes
        try {
          const res = await AIService.analyzeNote({ content: newContent, currentTitle: newTitle });
          setAiInsights(res);
          setIsAnalyzing(false);
          await onSave({ id: note.id, aiInsights: res, summary: res.summary, aiStatus: 'ready' }, false);
        } catch {
          setIsAnalyzing(false);
        }
      }
    }, 1200);
  };

  // Keyboard shortcut listener for Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandMenu(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Format action helpers
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    triggerAutosave(title, newContent, tagIds, folderId);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 50);
  };

  // Execute AI command (Rewrite, Summarize, etc.)
  const handleRunCommand = async (commandType: string, instruction?: string) => {
    try {
      setCommandLoading(true);
      const textarea = textareaRef.current;
      let targetText = content;
      if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
        targetText = content.substring(textarea.selectionStart, textarea.selectionEnd);
      }

      const res = await AIService.executeCommand({
        command: commandType,
        text: targetText,
        contextTitle: title,
        instruction,
      });

      setCommandPreview({
        original: targetText,
        suggested: res.resultText,
        explanation: res.explanation,
      });
    } catch (err: any) {
      console.error('Command error:', err);
    } finally {
      setCommandLoading(false);
    }
  };

  // Apply Command Suggestion
  const handleApplyCommand = () => {
    if (!commandPreview) return;
    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + commandPreview.suggested + content.substring(end);
      setContent(newContent);
      triggerAutosave(title, newContent, tagIds, folderId);
    } else {
      setContent(commandPreview.suggested);
      triggerAutosave(title, commandPreview.suggested, tagIds, folderId);
    }
    setCommandPreview(null);
    setShowCommandMenu(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0C0C0C] overflow-hidden text-white">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0C0C0C] z-20">
        <div className="flex items-center gap-3">
          <button
            id="editor-back-btn"
            onClick={onClose}
            aria-label="Back to notes"
            className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <span className="text-white/20">|</span>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Save size={12} className={isSaved ? 'text-emerald-400' : 'text-amber-400 animate-pulse'} />
            <span className="text-[11px] font-mono">{isSaved ? t.saveLocally : 'Saving...'}</span>
          </div>

          {/* AI status badge */}
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-semibold animate-pulse border border-white/10">
              <Sparkles size={11} className="animate-spin" />
              <span>{t.analyzing}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI Command Palette button */}
          <button
            id="editor-ai-command-btn"
            onClick={() => setShowCommandMenu(true)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0C0C0C] shadow-lg hover:opacity-90 transition-all cursor-pointer"
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline">AI Actions</span>
            <span className="sm:hidden">AI</span>
            <kbd className="hidden md:inline-block ms-1 rounded-full bg-[#0C0C0C] px-1.5 text-[9px] font-mono text-white">
              ⌘K
            </kbd>
          </button>

          {/* Toggle AI panel */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setShowMobileAISheet((prev) => !prev);
              } else {
                setShowAIPanel((prev) => !prev);
              }
            }}
            className={`relative p-2 rounded-full border text-xs font-medium transition-colors ${
              (showAIPanel || showMobileAISheet)
                ? 'border-white/20 bg-white/10 text-white shadow-xs'
                : 'border-white/10 text-white/40 hover:text-white'
            }`}
            title="Toggle AI Insights panel"
          >
            <Sparkles size={14} />
            {aiInsights && ((aiInsights.tasks && aiInsights.tasks.length > 0) || aiInsights.title) && !showMobileAISheet && (
              <span className="lg:hidden absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Archive */}
          <button
            onClick={() => onArchive(note.id!)}
            className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title={t.archive}
          >
            <Archive size={14} />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(note.id!)}
            className="p-2 rounded-full text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
            title={t.trash}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Editor Main Canvas & AI Panel Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto px-4 md:px-12 py-6 max-w-4xl mx-auto w-full">
          {/* Note Metadata Selectors: Folder & Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Folder selector */}
            <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <FolderIcon size={12} className="text-white/40" />
              <select
                value={folderId || ''}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  setFolderId(val);
                  triggerAutosave(title, content, tagIds, val);
                }}
                className="bg-transparent text-xs text-white/80 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#0C0C0C]">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id} className="bg-[#0C0C0C]">
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Pills */}
            {tagIds.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-medium text-white/70"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => {
                    const newTags = tagIds.filter((t) => t !== tag);
                    setTagIds(newTags);
                    triggerAutosave(title, content, newTags, folderId);
                  }}
                  className="hover:text-red-400"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          {/* Title Input */}
          <input
            id="editor-title-input"
            type="text"
            value={title}
            dir={isContentRTL ? 'rtl' : 'ltr'}
            onChange={(e) => {
              setTitle(e.target.value);
              triggerAutosave(e.target.value, content, tagIds, folderId);
            }}
            placeholder={t.titlePlaceholder}
            className="w-full text-2xl md:text-4xl font-light tracking-tight font-serif italic text-white/95 placeholder:text-white/20 bg-transparent border-none focus:outline-none mb-4 leading-tight"
          />

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 p-1.5 mb-6 rounded-full border border-white/10 bg-white/5 sticky top-0 z-10 backdrop-blur-md overflow-x-auto max-w-full no-scrollbar">
            <button
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Bold (Ctrl+B)"
            >
              <Bold size={13} />
            </button>
            <button
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              onClick={() => insertFormatting('# ')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Heading 1"
            >
              <Heading1 size={13} />
            </button>
            <button
              onClick={() => insertFormatting('## ')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Heading 2"
            >
              <Heading2 size={13} />
            </button>
            <button
              onClick={() => insertFormatting('- ')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Bullet List"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => insertFormatting('1. ')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Numbered List"
            >
              <ListOrdered size={13} />
            </button>
            <button
              onClick={() => insertFormatting('- [ ] ')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Checklist"
            >
              <CheckSquare size={13} />
            </button>
            <button
              onClick={() => insertFormatting('> ')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Quote"
            >
              <Quote size={13} />
            </button>
            <button
              onClick={() => insertFormatting('```\n', '\n```')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Code Block"
            >
              <Code size={13} />
            </button>
            <button
              onClick={() => insertFormatting('\n---\n')}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Divider"
            >
              <Minus size={13} />
            </button>
          </div>

          {/* Content Textarea */}
          <textarea
            ref={textareaRef}
            id="editor-content-textarea"
            value={content}
            dir={isContentRTL ? 'rtl' : 'ltr'}
            onChange={(e) => {
              setContent(e.target.value);
              triggerAutosave(title, e.target.value, tagIds, folderId);
            }}
            placeholder="Write your note here... Use markdown or plain text."
            className="w-full flex-1 min-h-[350px] resize-none bg-transparent text-base md:text-lg font-light text-white/90 leading-relaxed placeholder:text-white/20 focus:outline-none"
          />

          {/* Image Attachments */}
          {attachments.length > 0 && (
            <div className="mt-6 flex flex-col gap-2.5 border-t border-white/10 pt-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Attachments</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                  >
                    <img src={att.dataUrl} alt={att.name} className="w-full h-32 object-cover" />
                    <button
                      onClick={() => {
                        const newAtts = attachments.filter((a) => a.id !== att.id);
                        setAttachments(newAtts);
                        onSave({ id: note.id, attachments: newAtts });
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Notes Widget */}
          {relatedNotes.length > 0 && (
            <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                {t.relatedNotes} ({relatedNotes.length})
              </span>
              <div className="flex flex-col gap-2">
                {relatedNotes.map(({ note: rNote, reason }) => (
                  <button
                    key={rNote.id}
                    onClick={() => onOpenNote(rNote.id!)}
                    className="flex items-start justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-start hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-serif italic text-white/95">
                        {rNote.title || 'Untitled Note'}
                      </span>
                      <span className="text-[11px] text-white/40 font-light">{reason}</span>
                    </div>
                    <ExternalLink size={12} className="text-white/40 mt-1 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible AI Suggestions Sidebar (Desktop & Tablet) */}
        {showAIPanel && aiInsights && (
          <aside className="w-80 border-s border-white/10 bg-[#0C0C0C] p-4 overflow-y-auto hidden lg:flex flex-col gap-4">
            <AISuggestionPanel
              insights={aiInsights}
              currentTitle={title}
              language={language}
              onApplyTitle={(newTitle) => {
                setTitle(newTitle);
                triggerAutosave(newTitle, content, tagIds, folderId);
              }}
              onApplySummary={(newSummary) => {
                onSave({ id: note.id, summary: newSummary });
              }}
              onAddTask={async (task) => {
                await onAddTask({
                  title: task.title,
                  dueDate: task.dueDate,
                  priority: task.priority,
                  noteId: note.id,
                });
              }}
              onAddAllTasks={async (tasks) => {
                for (const task of tasks) {
                  await onAddTask({
                    title: task.title,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    noteId: note.id,
                  });
                }
              }}
              onAddTag={(tag) => {
                if (!tagIds.includes(tag)) {
                  const newTags = [...tagIds, tag];
                  setTagIds(newTags);
                  triggerAutosave(title, content, newTags, folderId);
                }
              }}
              onDismissTask={(taskId) => {
                setAiInsights((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    tasks: prev.tasks.filter((t) => t.id !== taskId),
                  };
                });
              }}
            />
          </aside>
        )}
      </div>

      {/* Mobile AI Insights Sheet */}
      {showMobileAISheet && aiInsights && (
        <>
          <div
            onClick={() => setShowMobileAISheet(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
          />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-[#0C0C0C] p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl transition-all">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-white" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">AI Insights & Review</span>
              </div>
              <button
                onClick={() => setShowMobileAISheet(false)}
                aria-label="Close AI panel"
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <AISuggestionPanel
              insights={aiInsights}
              currentTitle={title}
              language={language}
              onApplyTitle={(newTitle) => {
                setTitle(newTitle);
                triggerAutosave(newTitle, content, tagIds, folderId);
              }}
              onApplySummary={(newSummary) => {
                onSave({ id: note.id, summary: newSummary });
              }}
              onAddTask={async (task) => {
                await onAddTask({
                  title: task.title,
                  dueDate: task.dueDate,
                  priority: task.priority,
                  noteId: note.id,
                });
              }}
              onAddAllTasks={async (tasks) => {
                for (const task of tasks) {
                  await onAddTask({
                    title: task.title,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    noteId: note.id,
                  });
                }
              }}
              onAddTag={(tag) => {
                if (!tagIds.includes(tag)) {
                  const newTags = [...tagIds, tag];
                  setTagIds(newTags);
                  triggerAutosave(title, content, newTags, folderId);
                }
              }}
              onDismissTask={(taskId) => {
                setAiInsights((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    tasks: prev.tasks.filter((t) => t.id !== taskId),
                  };
                });
              }}
            />
          </div>
        </>
      )}

      {/* AI Command Palette Modal (Cmd+K) */}
      {showCommandMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-md">
          <div className="flex flex-col w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0C0C0C] shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-white">
                <Sparkles size={14} className="text-white" />
                <span>{t.aiCommandMenu}</span>
              </div>
              <button
                onClick={() => {
                  setShowCommandMenu(false);
                  setCommandPreview(null);
                }}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Actions List */}
            {!commandPreview && (
              <div className="flex flex-col p-6 gap-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleRunCommand('summarize')}
                    disabled={commandLoading}
                    className="flex items-center gap-2 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-xs font-medium text-white transition-all cursor-pointer"
                  >
                    <span>📝 {t.summarize}</span>
                  </button>
                  <button
                    onClick={() => handleRunCommand('rewrite')}
                    disabled={commandLoading}
                    className="flex items-center gap-2 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-xs font-medium text-white transition-all cursor-pointer"
                  >
                    <span>✨ {t.rewrite}</span>
                  </button>
                  <button
                    onClick={() => handleRunCommand('shorten')}
                    disabled={commandLoading}
                    className="flex items-center gap-2 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-xs font-medium text-white transition-all cursor-pointer"
                  >
                    <span>✂️ {t.shorten}</span>
                  </button>
                  <button
                    onClick={() => handleRunCommand('expand')}
                    disabled={commandLoading}
                    className="flex items-center gap-2 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-xs font-medium text-white transition-all cursor-pointer"
                  >
                    <span>🔍 {t.expand}</span>
                  </button>
                  <button
                    onClick={() => handleRunCommand('fix-grammar')}
                    disabled={commandLoading}
                    className="flex items-center gap-2 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-xs font-medium text-white transition-all cursor-pointer"
                  >
                    <span>🔤 {t.fixGrammar}</span>
                  </button>
                  <button
                    onClick={() => handleRunCommand('checklist')}
                    disabled={commandLoading}
                    className="flex items-center gap-2 p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-xs font-medium text-white transition-all cursor-pointer"
                  >
                    <span>☑️ {t.extractChecklist}</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Custom AI Instruction</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Translate to Hebrew, make professional..."
                      value={customCommandPrompt}
                      onChange={(e) => setCustomCommandPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customCommandPrompt.trim()) {
                          handleRunCommand('custom', customCommandPrompt.trim());
                        }
                      }}
                      className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
                    />
                    <button
                      onClick={() => handleRunCommand('custom', customCommandPrompt.trim())}
                      disabled={!customCommandPrompt.trim() || commandLoading}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-bold text-[#0C0C0C] hover:opacity-90 disabled:opacity-30 cursor-pointer"
                    >
                      {commandLoading ? <Loader2 size={13} className="animate-spin" /> : <span>Run</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Diff & Preview Comparison */}
            {commandPreview && (
              <div className="flex flex-col p-6 gap-4 max-h-[70vh] overflow-y-auto">
                {commandPreview.explanation && (
                  <div className="text-xs text-white/80 bg-white/5 p-3 rounded-2xl border border-white/10">
                    💡 {commandPreview.explanation}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{t.aiVersion}</span>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/90 max-h-48 overflow-y-auto whitespace-pre-wrap font-light leading-relaxed">
                    {commandPreview.suggested}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    onClick={() => setCommandPreview(null)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-white/50 hover:text-white"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleApplyCommand}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-xs font-bold text-[#0C0C0C] shadow-lg hover:opacity-90"
                  >
                    <Check size={13} />
                    <span>{t.apply}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
