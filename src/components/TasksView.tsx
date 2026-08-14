import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Calendar,
  Plus,
  Trash2,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import type { Task, AppLanguage, Note } from '../types';
import { TRANSLATIONS } from '../lib/i18n';

interface TasksViewProps {
  tasks: Task[];
  notes: Note[];
  language: AppLanguage;
  onToggleTask: (taskId: number, completed: boolean) => void;
  onAddTask: (task: { title: string; dueDate?: string; priority: 'low' | 'medium' | 'high'; noteId?: number }) => Promise<void>;
  onDeleteTask: (taskId: number) => void;
  onOpenNote: (noteId: number) => void;
  onNavigateToCapture?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  notes,
  language,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onOpenNote,
  onNavigateToCapture,
}) => {
  const t = TRANSLATIONS[language];
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAdding, setIsAdding] = useState(false);

  // Map notes by ID for quick title lookup
  const noteMap = new Map<number, Note>();
  notes.forEach((n) => {
    if (n.id) noteMap.set(n.id, n);
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filtering
  const filteredTasks = tasks.filter((task) => {
    // Tab filter
    if (filterTab === 'completed') {
      if (!task.completed) return false;
    } else {
      if (task.completed) return false;
      if (filterTab === 'today') {
        if (!task.dueDate || !task.dueDate.includes(todayStr)) return false;
      } else if (filterTab === 'upcoming') {
        if (!task.dueDate) return false;
      }
    }

    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await onAddTask({
      title: newTitle.trim(),
      dueDate: newDueDate || undefined,
      priority: newPriority,
    });

    setNewTitle('');
    setNewDueDate('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full py-6 px-4 md:px-8 gap-6 text-white">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight font-serif italic text-white/95">{t.tasks}</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {tasks.filter((t) => !t.completed).length} pending • {tasks.filter((t) => t.completed).length} completed
          </p>
        </div>

        <button
          id="add-task-btn"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 self-start sm:self-auto rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#0C0C0C] uppercase tracking-wider shadow-lg hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
          {(['all', 'today', 'upcoming', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                filterTab === tab
                  ? 'bg-white text-[#0C0C0C] font-semibold'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          <Filter size={12} className="text-white/40" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-transparent text-xs text-white/80 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0C0C0C] text-white">All Priorities</option>
            <option value="high" className="bg-[#0C0C0C] text-white">High Priority</option>
            <option value="medium" className="bg-[#0C0C0C] text-white">Medium Priority</option>
            <option value="low" className="bg-[#0C0C0C] text-white">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Inline Add Task Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3.5 rounded-3xl border border-white/20 bg-white/5 p-5 shadow-xl backdrop-blur-md"
        >
          <input
            type="text"
            autoFocus
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-sm font-medium text-white placeholder:text-white/30 bg-transparent focus:outline-none font-serif italic"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Due date (e.g. Tomorrow 3pm)"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 focus:outline-none cursor-pointer"
              >
                <option value="low" className="bg-[#0C0C0C]">Low Priority</option>
                <option value="medium" className="bg-[#0C0C0C]">Medium Priority</option>
                <option value="high" className="bg-[#0C0C0C]">High Priority</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1 text-xs text-white/40 hover:text-white"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 rounded-full bg-white text-xs font-bold text-[#0C0C0C] hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="flex flex-col gap-2.5">
        {filteredTasks.map((task) => {
          const sourceNote = task.noteId ? noteMap.get(task.noteId) : null;
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all backdrop-blur-sm ${
                task.completed
                  ? 'border-white/5 bg-white/[0.02] opacity-40'
                  : 'border-white/10 bg-white/5 hover:border-white/20 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1">
                <button
                  onClick={() => onToggleTask(task.id!, !task.completed)}
                  aria-label={task.completed ? "Mark task uncompleted" : "Mark task completed"}
                  className="flex items-center justify-center p-2 text-white/40 hover:text-white transition-colors shrink-0 cursor-pointer min-w-[40px] min-h-[40px] rounded-full active:bg-white/10"
                >
                  {task.completed ? (
                    <CheckSquare size={18} className="text-emerald-400" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>

                <div className="flex flex-col overflow-hidden">
                  <span
                    className={`text-xs md:text-sm font-medium ${
                      task.completed
                        ? 'line-through text-white/40 font-light'
                        : 'text-white/95'
                    }`}
                  >
                    {task.title}
                  </span>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                        <Calendar size={11} />
                        <span>{task.dueDate}</span>
                      </span>
                    )}

                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'high'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/20'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                          : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      {task.priority}
                    </span>

                    {sourceNote && (
                      <button
                        onClick={() => onOpenNote(sourceNote.id!)}
                        className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white hover:underline truncate max-w-[160px]"
                      >
                        <ExternalLink size={10} />
                        <span>{sourceNote.title || 'Note'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteTask(task.id!)}
                aria-label="Delete task"
                className="flex items-center justify-center p-2 text-white/30 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors min-w-[36px] min-h-[36px]"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <CheckCircle2 size={36} strokeWidth={1.2} className="text-white/20" />
            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-serif italic text-white/90">
                {t.emptyTasksHeading}
              </h3>
              <p className="text-xs sm:text-sm text-white/40 font-light leading-relaxed">
                {t.emptyTasksSub}
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
