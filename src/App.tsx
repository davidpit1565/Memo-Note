import React, { useState, useEffect } from 'react';
import { db, getSettings, saveSettings, DEFAULT_SETTINGS } from './lib/db';
import type { Note, Task, Folder, Tag, UserSettings, AppLanguage, ThemeMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { UniversalCapture } from './components/UniversalCapture';
import { NoteEditor } from './components/NoteEditor';
import { TasksView } from './components/TasksView';
import { AskNotesView } from './components/AskNotesView';
import { NotesListView } from './components/NotesListView';
import { DailyBriefView } from './components/DailyBriefView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { AIService } from './lib/ai-service';
import { hashContent } from './lib/hash';
import { isRTL } from './lib/i18n';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewFilter, setViewFilter] = useState<{ folderId?: string; tagId?: string } | undefined>(undefined);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);

  // Core Data
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // App UI State
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [aiStatus, setAiStatus] = useState<'online' | 'analyzing' | 'offline'>('online');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial Load & Database Seeding
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const userSettings = await getSettings();
      setSettings(userSettings);
      setLanguage(userSettings.language);

      // Default to dark theme for Sophisticated Dark aesthetic
      setTheme('dark');
      document.documentElement.classList.add('dark');

      // Check AI Server Health
      const health = await AIService.checkHealth();
      setAiStatus(health.hasApiKey ? 'online' : 'offline');

      // Seed initial sample data if DB is completely empty
      const noteCount = await db.notes.count();
      if (noteCount === 0) {
        await seedSampleData();
      }

      await refreshAllData();
      setIsLoaded(true);
    } catch (err) {
      console.error('Initialization error:', err);
      setIsLoaded(true);
    }
  };

  const seedSampleData = async () => {
    // Initial Folders
    await db.folders.bulkPut([
      { id: 'f_work', name: 'Work & Projects', createdAt: Date.now() },
      { id: 'f_personal', name: 'Personal', createdAt: Date.now() },
      { id: 'f_travel', name: 'Travel & Trips', createdAt: Date.now() },
    ]);

    // Initial Tags
    await db.tags.bulkPut([
      { id: 't_meeting', name: 'meeting', createdAt: Date.now() },
      { id: 't_trip', name: 'trip', createdAt: Date.now() },
      { id: 't_finance', name: 'finance', createdAt: Date.now() },
      { id: 't_urgent', name: 'urgent', createdAt: Date.now() },
    ]);

    // Sample Notes with rich AI Insights
    const n1 = await db.notes.add({
      title: 'Rome Summer Vacation Planning',
      content: `Meeting with David to finalize the trip details for Rome in August.
Book flight tickets on Tuesday morning before prices increase.
Need to reserve hotel near Pantheon and check airport shuttle transfer.
David mentioned looking into the Colosseum guided tour tickets in advance.`,
      plainText: `Meeting with David to finalize the trip details for Rome in August.
Book flight tickets on Tuesday morning before prices increase.
Need to reserve hotel near Pantheon and check airport shuttle transfer.
David mentioned looking into the Colosseum guided tour tickets in advance.`,
      folderId: 'f_travel',
      tagIds: ['trip', 'urgent'],
      isPinned: true,
      isArchived: false,
      isDeleted: false,
      createdAt: Date.now() - 3600000 * 24 * 2,
      updatedAt: Date.now() - 3600000 * 4,
      aiStatus: 'ready',
      summary: 'Trip planning meeting with David for Rome summer vacation, focusing on booking flights and Pantheon hotel.',
      aiInsights: {
        title: 'Rome Summer Vacation Planning',
        summary: 'Trip planning meeting with David for Rome summer vacation, focusing on booking flights and Pantheon hotel.',
        tasks: [
          { id: 't_1', title: 'Book Rome flight tickets', dueDate: 'Tuesday 10:00 AM', priority: 'high' },
          { id: 't_2', title: 'Reserve hotel near Pantheon', dueDate: 'Friday', priority: 'medium' },
          { id: 't_3', title: 'Check Colosseum tour tickets in advance', priority: 'low' },
        ],
        dates: [{ text: 'Tuesday morning', normalizedDate: '2026-08-18', confidence: 0.95, label: 'Flight booking' }],
        people: [{ name: 'David', confidence: 0.95, role: 'Travel partner' }],
        places: [{ name: 'Rome', confidence: 0.95 }, { name: 'Pantheon', confidence: 0.9 }],
        tags: ['travel', 'rome', 'vacation'],
        topics: ['Travel Logistics', 'Flight Booking'],
        decisions: ['Stay near Pantheon in Rome'],
        questions: ['When do Colosseum tickets open?'],
        importantFacts: [],
        relatedConcepts: ['Hotel reservations', 'Flight comparison'],
        language: 'en',
      },
    });

    const n2 = await db.notes.add({
      title: 'סיכום פגישה עם עו״ד רון - חוזה שכירות דירה',
      content: `דיברנו על סעיפי חוזה השכירות החדש ברחוב דיזנגוף תל אביב.
יש לבקש מעו"ד רון לתקן את סעיף הערבות הבנקאית ל-3 חודשים במקום 4.
לתאם פגישת חתימה עם בעל הבית ביום חמישי הקרוב בשעה 16:00.
לוודא העברת תשלום ראשון בצ'ק בנקאי.`,
      plainText: `דיברנו על סעיפי חוזה השכירות החדש ברחוב דיזנגוף תל אביב.
יש לבקש מעו"ד רון לתקן את סעיף הערבות הבנקאית ל-3 חודשים במקום 4.
לתאם פגישת חתימה עם בעל הבית ביום חמישי הקרוב בשעה 16:00.
לוודא העברת תשלום ראשון בצ'ק בנקאי.`,
      folderId: 'f_personal',
      tagIds: ['meeting', 'finance'],
      isPinned: false,
      isArchived: false,
      isDeleted: false,
      createdAt: Date.now() - 3600000 * 20,
      updatedAt: Date.now() - 3600000 * 1,
      aiStatus: 'ready',
      summary: 'פגישה בנוגע לחוזה שכירות בדיזנגוף תל אביב ותיקון ערבות בנקאית מול עו״ד רון.',
      aiInsights: {
        title: 'סיכום פגישה עם עו״ד רון - חוזה שכירות דירה',
        summary: 'פגישה בנוגע לחוזה שכירות בדיזנגוף תל אביב ותיקון ערבות בנקאית מול עו״ד רון.',
        tasks: [
          { id: 't_4', title: 'לבקש מעו"ד רון תיקון סעיף ערבות ל-3 חודשים', priority: 'high' },
          { id: 't_5', title: 'פגישת חתימת חוזה עם בעל הבית', dueDate: 'יום חמישי 16:00', priority: 'high' },
        ],
        dates: [{ text: 'יום חמישי הקרוב בשעה 16:00', normalizedDate: '2026-08-20T16:00:00', confidence: 0.95 }],
        people: [{ name: 'עו"ד רון', confidence: 0.95, role: 'עורך דין' }],
        places: [{ name: 'תל אביב - דיזנגוף', confidence: 0.95 }],
        tags: ['שכירות', 'תל-אביב', 'חוזה'],
        topics: ['שכירות נדל"ן', 'משפטי'],
        decisions: ['הפחתת ערבות ל-3 חודשים'],
        questions: [],
        importantFacts: ['ערבות 3 חודשים'],
        relatedConcepts: ['חוזי שכירות', 'צ׳ק בנקאי'],
        language: 'he',
      },
    });

    // Sample Tasks
    await db.tasks.bulkPut([
      { title: 'Book Rome flight tickets', dueDate: 'Tuesday 10:00 AM', priority: 'high', completed: false, noteId: Number(n1), createdAt: Date.now() },
      { title: 'Reserve hotel near Pantheon', dueDate: 'Friday', priority: 'medium', completed: false, noteId: Number(n1), createdAt: Date.now() },
      { title: 'לבקש מעו"ד רון תיקון סעיף ערבות ל-3 חודשים', priority: 'high', completed: false, noteId: Number(n2), createdAt: Date.now() },
      { title: 'פגישת חתימת חוזה עם בעל הבית', dueDate: 'יום חמישי 16:00', priority: 'high', completed: false, noteId: Number(n2), createdAt: Date.now() },
    ]);
  };

  const refreshAllData = async () => {
    const allNotes = await db.notes.toArray();
    const allTasks = await db.tasks.toArray();
    const allFolders = await db.folders.toArray();
    const allTags = await db.tags.toArray();

    setNotes(allNotes);
    setTasks(allTasks);
    setFolders(allFolders);
    setTags(allTags);
  };

  // Switch Theme
  const handleToggleTheme = (newTheme?: ThemeMode) => {
    const nextTheme = newTheme || (theme === 'dark' ? 'light' : 'dark');
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveSettings({ theme: nextTheme });
  };

  // Switch Language
  const handleToggleLanguage = (newLang?: AppLanguage) => {
    const nextLang = newLang || (language === 'en' ? 'he' : 'en');
    setLanguage(nextLang);
    document.documentElement.dir = isRTL(nextLang) ? 'rtl' : 'ltr';
    saveSettings({ language: nextLang });
  };

  // Save / Update Note in Dexie with optional async AI Trigger
  const handleSaveNote = async (noteData: Partial<Note>, triggerAI = false): Promise<Note> => {
    let savedId = noteData.id;
    const now = Date.now();

    if (savedId) {
      await db.notes.update(savedId, { ...noteData, updatedAt: now });
    } else {
      const { id: _, ...createPayload } = noteData;
      savedId = await db.notes.add({
        title: createPayload.title || 'Untitled Note',
        content: createPayload.content || '',
        plainText: createPayload.plainText || createPayload.content || '',
        folderId: createPayload.folderId,
        tagIds: createPayload.tagIds || [],
        isPinned: createPayload.isPinned || false,
        isArchived: createPayload.isArchived || false,
        isDeleted: false,
        createdAt: createPayload.createdAt || now,
        updatedAt: now,
        aiStatus: triggerAI ? 'analyzing' : createPayload.aiStatus || 'idle',
        summary: createPayload.summary,
        aiInsights: createPayload.aiInsights,
        attachments: createPayload.attachments,
        language: createPayload.language || 'en',
      } as Note);
    }

    const updatedNote = (await db.notes.get(savedId))!;
    await refreshAllData();

    // Asynchronous AI Processing
    if (triggerAI && updatedNote.content && updatedNote.content.length >= 10) {
      setAiStatus('analyzing');
      AIService.analyzeNote({
        content: updatedNote.content,
        currentTitle: updatedNote.title,
      })
        .then(async (insights) => {
          const titleUpdate = !updatedNote.title || updatedNote.title === 'Untitled Note' || updatedNote.title.length < 5 ? (insights.title || updatedNote.title) : updatedNote.title;
          await db.notes.update(savedId!, {
            aiInsights: insights,
            summary: insights.summary,
            title: titleUpdate,
            aiStatus: 'ready',
            contentHash: hashContent(updatedNote.content),
          });
          await refreshAllData();
          setAiStatus('online');
        })
        .catch((err) => {
          console.error('Background AI analysis failed:', err);
          db.notes.update(savedId!, { aiStatus: 'idle' });
          setAiStatus('online');
        });
    }

    return updatedNote;
  };

  // Add Task
  const handleAddTask = async (taskData: { title: string; dueDate?: string; priority: 'low' | 'medium' | 'high'; noteId?: number }) => {
    await db.tasks.add({
      title: taskData.title,
      dueDate: taskData.dueDate,
      priority: taskData.priority,
      completed: false,
      noteId: taskData.noteId,
      createdAt: Date.now(),
    });
    await refreshAllData();
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId: number, completed: boolean) => {
    await db.tasks.update(taskId, {
      completed,
      completedAt: completed ? Date.now() : undefined,
    });
    await refreshAllData();
  };

  // Delete Task
  const handleDeleteTask = async (taskId: number) => {
    await db.tasks.delete(taskId);
    await refreshAllData();
  };

  // Create Folder
  const handleCreateFolder = async (name: string) => {
    const id = `f_${Date.now()}`;
    await db.folders.put({ id, name, createdAt: Date.now() });
    await refreshAllData();
  };

  // Create Tag
  const handleCreateTag = async (name: string) => {
    const id = `t_${Date.now()}`;
    await db.tags.put({ id, name, createdAt: Date.now() });
    await refreshAllData();
  };

  // Note Actions (Archive, Trash, Pin, Restore, Permanent Delete)
  const handleTogglePin = async (noteId: number, isPinned: boolean) => {
    await db.notes.update(noteId, { isPinned, updatedAt: Date.now() });
    await refreshAllData();
  };

  const handleArchiveNote = async (noteId: number) => {
    await db.notes.update(noteId, { isArchived: true, updatedAt: Date.now() });
    if (activeNoteId === noteId) setActiveNoteId(null);
    await refreshAllData();
  };

  const handleTrashNote = async (noteId: number) => {
    await db.notes.update(noteId, { isDeleted: true, updatedAt: Date.now() });
    if (activeNoteId === noteId) setActiveNoteId(null);
    await refreshAllData();
  };

  const handleRestoreNote = async (noteId: number) => {
    await db.notes.update(noteId, { isDeleted: false, isArchived: false, updatedAt: Date.now() });
    await refreshAllData();
  };

  const handlePermanentDelete = async (noteId: number) => {
    await db.notes.delete(noteId);
    await db.tasks.where('noteId').equals(noteId).delete();
    if (activeNoteId === noteId) setActiveNoteId(null);
    await refreshAllData();
  };

  const handleEmptyTrash = async () => {
    const trashed = await db.notes.where('isDeleted').equals(1).toArray();
    for (const n of trashed) {
      if (n.id) {
        await db.notes.delete(n.id);
        await db.tasks.where('noteId').equals(n.id).delete();
      }
    }
    await refreshAllData();
  };

  // Create Brand New Note and open editor
  const handleOpenNewNote = async () => {
    const newNote = await handleSaveNote({
      title: '',
      content: '',
      plainText: '',
      isPinned: false,
      isArchived: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aiStatus: 'idle',
    });
    setActiveNoteId(newNote.id!);
  };

  const handleCompleteOnboarding = async (name: string, lang: AppLanguage) => {
    const updated = await saveSettings({
      ...settings,
      userName: name,
      language: lang,
      hasCompletedOnboarding: true,
    });
    setSettings(updated);
    setLanguage(lang);
  };

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const activeNotes = notes.filter((n) => !n.isDeleted && !n.isArchived);

  if (isLoaded && !settings.hasCompletedOnboarding) {
    return (
      <div
        dir={isRTL(language) ? 'rtl' : 'ltr'}
        className="min-h-screen bg-[#0C0C0C] text-white"
      >
        <OnboardingModal
          language={language}
          onComplete={handleCompleteOnboarding}
        />
      </div>
    );
  }

  return (
    <div
      dir={isRTL(language) ? 'rtl' : 'ltr'}
      className="flex min-h-screen flex-col bg-[#0C0C0C] text-white font-sans antialiased selection:bg-white/20 selection:text-white"
    >
      <Header
        currentView={currentView}
        language={language}
        theme={theme}
        onToggleTheme={() => handleToggleTheme()}
        onToggleLanguage={() => handleToggleLanguage()}
        onOpenNewNote={handleOpenNewNote}
        onOpenSearch={() => {
          setActiveNoteId(null);
          setCurrentView('search');
        }}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        aiStatus={aiStatus}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={(view, filter) => {
            setActiveNoteId(null);
            setCurrentView(view);
            setViewFilter(filter);
          }}
          language={language}
          pendingTasksCount={pendingTasks.length}
          totalNotesCount={activeNotes.length}
          folders={folders}
          tags={tags}
          onCreateFolder={handleCreateFolder}
          onCreateTag={handleCreateTag}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content View Switcher */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6 bg-[#0C0C0C]">
          {activeNote ? (
            <NoteEditor
              note={activeNote}
              folders={folders}
              tags={tags}
              language={language}
              onSave={handleSaveNote}
              onDelete={handleTrashNote}
              onArchive={handleArchiveNote}
              onClose={() => setActiveNoteId(null)}
              onAddTask={handleAddTask}
              allNotes={notes}
              onOpenNote={(id) => setActiveNoteId(id)}
            />
          ) : currentView === 'home' ? (
            <UniversalCapture
              language={language}
              userName={settings.userName}
              onSaveNote={handleSaveNote}
              onAddTask={handleAddTask}
              onOpenNote={(id) => setActiveNoteId(id)}
              recentNotes={activeNotes.slice(0, 5)}
              todayTasks={pendingTasks}
            />
          ) : currentView === 'notes' || currentView === 'archive' || currentView === 'trash' ? (
            <NotesListView
              viewType={currentView as any}
              notes={notes}
              folders={folders}
              tags={tags}
              language={language}
              activeFilter={viewFilter}
              onOpenNote={(id) => setActiveNoteId(id)}
              onTogglePin={handleTogglePin}
              onArchive={handleArchiveNote}
              onTrash={handleTrashNote}
              onRestore={handleRestoreNote}
              onPermanentDelete={handlePermanentDelete}
              onEmptyTrash={handleEmptyTrash}
              onNavigateToCapture={() => {
                setActiveNoteId(null);
                setCurrentView('home');
              }}
            />
          ) : currentView === 'tasks' ? (
            <TasksView
              tasks={tasks}
              notes={notes}
              language={language}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onOpenNote={(id) => setActiveNoteId(id)}
              onNavigateToCapture={() => {
                setActiveNoteId(null);
                setCurrentView('home');
              }}
            />
          ) : currentView === 'ask' ? (
            <AskNotesView
              notes={activeNotes}
              language={language}
              onOpenNote={(id) => setActiveNoteId(id)}
            />
          ) : currentView === 'brief' ? (
            <DailyBriefView
              userName={settings.userName}
              notes={notes}
              tasks={tasks}
              language={language}
              onOpenNote={(id) => setActiveNoteId(id)}
            />
          ) : currentView === 'search' ? (
            <SearchView
              notes={notes}
              folders={folders}
              tags={tags}
              language={language}
              onOpenNote={(id) => setActiveNoteId(id)}
            />
          ) : currentView === 'settings' ? (
            <SettingsView
              settings={settings}
              language={language}
              theme={theme}
              onUpdateSettings={async (up) => {
                const updated = await saveSettings(up);
                setSettings(updated);
              }}
              onToggleTheme={handleToggleTheme}
              onToggleLanguage={handleToggleLanguage}
              onRefreshData={refreshAllData}
            />
          ) : null}
        </main>
      </div>

      {/* Mobile Persistent Bottom Navigation Bar */}
      {!activeNote && (
        <MobileBottomNav
          currentView={currentView}
          onSelectView={(view) => {
            setActiveNoteId(null);
            setCurrentView(view);
            setViewFilter(undefined);
          }}
          language={language}
          pendingTasksCount={pendingTasks.length}
          totalNotesCount={activeNotes.length}
          onOpenMobileDrawer={() => setIsMobileMenuOpen(true)}
        />
      )}

      {/* Sophisticated Dark Bottom Status Bar (Desktop only) */}
      <footer className="hidden md:flex h-10 border-t border-white/5 bg-[#0C0C0C] items-center justify-between px-6 text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold select-none shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{activeNotes.length} Notes Indexed</span>
          </div>
          <span className="hidden sm:inline text-white/10">•</span>
          <span className="hidden sm:inline">Offline IndexedDB Ready</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-white/30 font-medium lowercase italic font-serif">gemini-2.5-flash online</span>
          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/60">
            Local Sync Active
          </span>
        </div>
      </footer>
    </div>
  );
}
