import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Edit2,
  Calendar,
  User,
  MapPin,
  Tag as TagIcon,
  CheckSquare,
  Plus,
  BookmarkCheck
} from 'lucide-react';
import type { AIInsight, AppLanguage, NoteTask } from '../types';
import { TRANSLATIONS } from '../lib/i18n';

interface AISuggestionPanelProps {
  insights?: AIInsight;
  currentTitle?: string;
  language: AppLanguage;
  onApplyTitle: (title: string) => void;
  onApplySummary: (summary: string) => void;
  onAddTask: (task: NoteTask) => void;
  onAddAllTasks: (tasks: NoteTask[]) => void;
  onAddTag: (tag: string) => void;
  onDismissTask: (taskId: string) => void;
  onDismissSection?: (section: string) => void;
}

export const AISuggestionPanel: React.FC<AISuggestionPanelProps> = ({
  insights,
  currentTitle,
  language,
  onApplyTitle,
  onApplySummary,
  onAddTask,
  onAddAllTasks,
  onAddTag,
  onDismissTask,
}) => {
  const t = TRANSLATIONS[language];
  const [dismissedSections, setDismissedSections] = useState<Record<string, boolean>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [isSavedToMemory, setIsSavedToMemory] = useState(false);
  const [acceptedTaskIds, setAcceptedTaskIds] = useState<Record<string, boolean>>({});

  if (!insights) return null;

  const hasTasks = insights.tasks && insights.tasks.length > 0;
  const hasPeople = insights.people && insights.people.length > 0;
  const hasPlaces = insights.places && insights.places.length > 0;
  const hasDates = insights.dates && insights.dates.length > 0;
  const hasTags = insights.tags && insights.tags.length > 0;

  const isTitleDifferent = insights.title && insights.title !== currentTitle && !dismissedSections['title'];
  const hasContent = isTitleDifferent || hasTasks || hasPeople || hasPlaces || hasDates || hasTags;

  if (!hasContent) return null;

  const handleSaveAllToMemory = () => {
    if (isTitleDifferent && insights.title) {
      onApplyTitle(insights.title);
    }
    if (insights.summary) {
      onApplySummary(insights.summary);
    }
    if (hasTasks) {
      onAddAllTasks(insights.tasks);
      const allIds: Record<string, boolean> = {};
      insights.tasks.forEach((tk) => (allIds[tk.id] = true));
      setAcceptedTaskIds(allIds);
    }
    if (hasTags) {
      insights.tags.forEach((tag) => onAddTag(tag));
    }
    setIsSavedToMemory(true);
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/5 p-5 transition-all text-white backdrop-blur-md">
      {/* Header: Human natural phrase */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-white/80" />
          <p className="text-sm font-serif italic text-white/90">
            {t.aiReviewHeading}
          </p>
        </div>

        <button
          onClick={handleSaveAllToMemory}
          disabled={isSavedToMemory}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm ${
            isSavedToMemory
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-white text-[#0C0C0C] hover:opacity-90 active:scale-95'
          }`}
        >
          {isSavedToMemory ? (
            <>
              <BookmarkCheck size={13} className="text-emerald-400" />
              <span>{t.savedToMemory}</span>
            </>
          ) : (
            <>
              <Check size={13} strokeWidth={2.5} />
              <span>{t.saveToMemory}</span>
            </>
          )}
        </button>
      </div>

      {/* Suggested Title */}
      {isTitleDifferent && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.suggestedTitle}</span>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTitle || insights.title || ''}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
              <button
                onClick={() => {
                  onApplyTitle(customTitle || insights.title || '');
                  setEditingTitle(false);
                }}
                className="p-1.5 rounded-full bg-white text-[#0C0C0C]"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                className="p-1.5 rounded-full text-white/50 hover:bg-white/10"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-white/90 font-serif italic">{insights.title}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onApplyTitle(insights.title!)}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#0C0C0C] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Check size={11} />
                  <span>{t.accept}</span>
                </button>
                <button
                  onClick={() => {
                    setCustomTitle(insights.title || '');
                    setEditingTitle(true);
                  }}
                  className="p-1.5 text-white/40 hover:text-white rounded-full transition-colors cursor-pointer"
                  title={t.edit}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => setDismissedSections((prev) => ({ ...prev, title: true }))}
                  className="p-1.5 text-white/30 hover:text-red-400 rounded-full transition-colors cursor-pointer"
                  title={t.dismiss}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extracted Tasks / Action Items */}
      {hasTasks && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            {t.extractedTasks}
          </span>
          <div className="flex flex-col gap-2">
            {insights.tasks.map((task) => {
              const isAccepted = acceptedTaskIds[task.id];
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between gap-2 rounded-2xl border p-3 shadow-sm transition-colors ${
                    isAccepted
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 overflow-hidden flex-1 pe-2">
                    <span className="text-xs font-medium text-white/95 line-clamp-2">{task.title}</span>
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50 mt-0.5">
                        <Calendar size={11} />
                        <span>{task.dueDate}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isAccepted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
                        <Check size={11} />
                        <span>{t.taskAdded}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onAddTask(task);
                          setAcceptedTaskIds((prev) => ({ ...prev, [task.id]: true }));
                        }}
                        className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0C0C0C] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus size={11} strokeWidth={2.5} />
                        <span>{t.accept}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDismissTask(task.id)}
                      className="p-1.5 text-white/30 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                      title={t.dismiss}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extracted Entities: People & Places */}
      {(hasPeople || hasPlaces) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          {insights.people?.map((person, idx) => (
            <span
              key={`p-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[11px] font-medium text-purple-200"
            >
              <User size={11} className="text-purple-400" />
              <span>{person.name}</span>
              <span className="text-[9px] uppercase tracking-wider text-purple-400/60 font-semibold">{t.people.slice(0, -1) || 'Person'}</span>
            </span>
          ))}
          {insights.places?.map((place, idx) => (
            <span
              key={`pl-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-[11px] font-medium text-indigo-200"
            >
              <MapPin size={11} className="text-indigo-400" />
              <span>{place.name}</span>
              <span className="text-[9px] uppercase tracking-wider text-indigo-400/60 font-semibold">{t.places.slice(0, -1) || 'Place'}</span>
            </span>
          ))}
        </div>
      )}

      {/* Suggested Tags */}
      {hasTags && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {insights.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onAddTag(tag)}
              className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Plus size={10} />
              <span>#{tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
