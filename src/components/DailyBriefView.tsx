import React, { useState } from 'react';
import {
  Sparkles,
  CheckSquare,
  FileText,
  User,
  MapPin,
  Calendar,
  Loader2,
  ArrowRight
} from 'lucide-react';
import type { Note, Task, AppLanguage } from '../types';
import { TRANSLATIONS } from '../lib/i18n';
import { AIService } from '../lib/ai-service';

interface DailyBriefViewProps {
  userName?: string;
  notes: Note[];
  tasks: Task[];
  language: AppLanguage;
  onOpenNote: (noteId: number) => void;
}

export const DailyBriefView: React.FC<DailyBriefViewProps> = ({
  userName,
  notes,
  tasks,
  language,
  onOpenNote,
}) => {
  const t = TRANSLATIONS[language];
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Real calculations
  const pendingTasks = tasks.filter((t) => !t.completed);
  const todayTasks = pendingTasks.filter((t) => t.dueDate && t.dueDate.includes(todayStr));
  const recentNotes = notes.filter((n) => !n.isDeleted && !n.isArchived && (n.updatedAt || n.createdAt) >= oneWeekAgo);

  // Aggregate entities
  const peopleMap = new Map<string, number>();
  const placesMap = new Map<string, number>();

  notes.forEach((n) => {
    if (n.isDeleted || n.isArchived) return;
    if (n.aiInsights?.people) {
      n.aiInsights.people.forEach((p) => peopleMap.set(p.name, (peopleMap.get(p.name) || 0) + 1));
    }
    if (n.aiInsights?.places) {
      n.aiInsights.places.forEach((p) => placesMap.set(p.name, (placesMap.get(p.name) || 0) + 1));
    }
  });

  const topPeople = Array.from(peopleMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topPlaces = Array.from(placesMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const getGreeting = () => {
    const hour = now.getHours();
    if (language === 'he') {
      if (hour < 12) return 'בוקר טוב';
      if (hour < 17) return 'צהריים טובים';
      if (hour < 21) return 'ערב טוב';
      return 'לילה טוב';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const generateAIBrief = async () => {
    try {
      setIsGenerating(true);
      const textNotes = recentNotes.slice(0, 10).map((n) => `- [${n.title}]: ${n.summary || n.plainText.slice(0, 200)}`).join('\n');
      const textTasks = pendingTasks.slice(0, 10).map((t) => `- [Task]: ${t.title} (Due: ${t.dueDate || 'None'}, Priority: ${t.priority})`).join('\n');

      const prompt = `Generate a calm, personal, human executive brief for ${userName || 'the user'} based on their active notes and tasks.
Highlight what matters most today, key pending action items, and people they have notes with.
Keep the tone natural, editorial, and concise.

Recent Notes:
${textNotes || 'No notes this week'}

Pending Tasks:
${textTasks || 'No pending tasks'}`;

      const res = await AIService.executeCommand({
        command: 'daily-brief',
        text: prompt,
        instruction: 'Create an executive morning brief',
      });

      setAiSummary(res.resultText);
    } catch (err) {
      console.error('Failed to generate AI brief:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full py-6 px-4 md:px-6 gap-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight font-serif italic text-white/95">
            {getGreeting()}{userName ? `, ${userName}` : ''}.
          </h1>
          <p className="text-sm text-white/50 font-light mt-1">
            {language === 'he' ? 'היום שלך במבט חטוף.' : 'Your day at a glance.'}
          </p>
        </div>

        <button
          onClick={generateAIBrief}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0C0C0C] shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          <span>{language === 'he' ? 'עדכן תקציר' : 'Brief Me'}</span>
        </button>
      </div>

      {/* AI Daily Reflection Card */}
      {aiSummary && (
        <div className="flex flex-col gap-2.5 rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 text-white/80 font-medium text-xs">
            <Sparkles size={14} className="text-white" />
            <span>{language === 'he' ? 'תקציר מותאם אישית' : 'Daily Reflection'}</span>
          </div>
          <div className="text-xs sm:text-sm text-white/90 leading-relaxed whitespace-pre-wrap font-serif italic font-light">
            {aiSummary}
          </div>
        </div>
      )}

      {/* Meaningful Sections: Pending Action Items & Recent Memory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Action Items */}
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-white/80">
              <CheckSquare size={14} className="text-white/40" />
              <span>{language === 'he' ? 'משימות ופעולות פתוחות' : 'Action Items'}</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
              {pendingTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {pendingTasks.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-light"
              >
                <span className="text-white/90 truncate">{t.title}</span>
                {t.dueDate && (
                  <span className="text-[10px] text-white/40 whitespace-nowrap shrink-0">{t.dueDate}</span>
                )}
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <p className="text-xs text-white/30 font-light py-4 text-center">
                {t.emptyTasks}
              </p>
            )}
          </div>
        </div>

        {/* Recent Notes in Memory */}
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-white/80">
              <FileText size={14} className="text-white/40" />
              <span>{language === 'he' ? 'פתקים מהשבוע האחרון' : 'Recent Memory'}</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
              {recentNotes.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {recentNotes.slice(0, 5).map((n) => (
              <button
                key={n.id}
                onClick={() => onOpenNote(n.id!)}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-start hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer"
              >
                <span className="text-xs font-light text-white/90 truncate">
                  {n.title || 'Untitled Note'}
                </span>
                <ArrowRight size={12} className="text-white/40 shrink-0 rtl:rotate-180" />
              </button>
            ))}
            {recentNotes.length === 0 && (
              <p className="text-xs text-white/30 font-light py-4 text-center">
                {t.emptyNotes}
              </p>
            )}
          </div>
        </div>

        {/* People in Your Memory */}
        {topPeople.length > 0 && (
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-medium text-white/80">
              <User size={14} className="text-purple-400/80" />
              <span>{language === 'he' ? 'אנשים שהוזכרו לאחרונה' : 'People Mentioned'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topPeople.map(([person, count]) => (
                <span
                  key={person}
                  className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs text-purple-200"
                >
                  <span>{person}</span>
                  <span className="text-[10px] text-purple-300/60 font-semibold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Places Mentioned */}
        {topPlaces.length > 0 && (
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-medium text-white/80">
              <MapPin size={14} className="text-indigo-400/80" />
              <span>{language === 'he' ? 'מקומות שהוזכרו' : 'Places & Venues'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topPlaces.map(([place, count]) => (
                <span
                  key={place}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs text-indigo-200"
                >
                  <span>{place}</span>
                  <span className="text-[10px] text-indigo-300/60 font-semibold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
