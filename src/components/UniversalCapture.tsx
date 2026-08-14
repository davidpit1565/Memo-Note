import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Mic,
  Image as ImageIcon,
  Loader2,
  Calendar,
  AlertCircle,
  FileText,
  CheckSquare,
  ArrowRight,
  BookmarkCheck,
  Send
} from 'lucide-react';
import type { AppLanguage, Note, Task } from '../types';
import { TRANSLATIONS, detectContentLanguage, isRTL } from '../lib/i18n';
import { AISuggestionPanel } from './AISuggestionPanel';
import { AIService } from '../lib/ai-service';

interface UniversalCaptureProps {
  userName?: string;
  language: AppLanguage;
  onSaveNote: (note: Partial<Note>, triggerAI?: boolean) => Promise<Note>;
  onAddTask: (task: { title: string; dueDate?: string; priority: 'low' | 'medium' | 'high'; noteId?: number }) => Promise<void>;
  onOpenNote: (noteId: number) => void;
  recentNotes: Note[];
  todayTasks: Task[];
}

export const UniversalCapture: React.FC<UniversalCaptureProps> = ({
  userName,
  language,
  onSaveNote,
  onAddTask,
  onOpenNote,
  recentNotes,
  todayTasks,
}) => {
  const t = TRANSLATIONS[language];
  const [content, setContent] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapturedNote, setLastCapturedNote] = useState<Note | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Quick Capture handler
  const handleCapture = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = content.trim();
    if (!text || isCapturing) return;

    // Dismiss soft keyboard on mobile devices
    textareaRef.current?.blur();

    try {
      setIsCapturing(true);
      setErrorMessage(null);
      const detectedLang = detectContentLanguage(text);

      // 1. Immediately save to IndexedDB
      const savedNote = await onSaveNote(
        {
          title: text.split('\n')[0].slice(0, 60),
          content: text,
          plainText: text,
          language: detectedLang,
          tagIds: [],
          isPinned: false,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          aiStatus: 'analyzing',
        },
        true
      );

      setContent('');
      setLastCapturedNote(savedNote);
    } catch (err: any) {
      console.error('Error capturing note:', err);
      setErrorMessage(err?.message || 'Failed to save note');
    } finally {
      setIsCapturing(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Process audio with Gemini
        setIsProcessingAudio(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const res = await AIService.transcribeAudio(base64Audio, 'audio/webm');
            
            if (res.transcription) {
              const text = res.transcription;
              const savedNote = await onSaveNote(
                {
                  title: res.title || text.split('\n')[0].slice(0, 50),
                  content: text,
                  plainText: text,
                  summary: res.summary,
                  tagIds: res.tags || ['voice'],
                  isPinned: false,
                  isArchived: false,
                  isDeleted: false,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  aiStatus: 'ready',
                },
                true
              );
              setLastCapturedNote(savedNote);
            }
            setIsProcessingAudio(false);
          };
        } catch (err: any) {
          console.error('Audio transcription error:', err);
          setErrorMessage(err?.message || 'Failed to transcribe audio.');
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setErrorMessage('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await AIService.analyzeVision(base64, file.type || 'image/jpeg');

        const savedNote = await onSaveNote(
          {
            title: res.title || 'Image Note',
            content: res.transcribedText || 'Image note',
            plainText: res.transcribedText || '',
            summary: res.summary,
            tagIds: res.tags || ['image'],
            attachments: [
              {
                id: Date.now().toString(),
                name: file.name,
                type: file.type,
                dataUrl: base64,
                size: file.size,
                createdAt: Date.now(),
              },
            ],
            isPinned: false,
            isArchived: false,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            aiStatus: 'ready',
          },
          true
        );

        setLastCapturedNote(savedNote);
      } catch (err: any) {
        console.error('Vision analysis error:', err);
        setErrorMessage(err?.message || 'Failed to analyze image');
      } finally {
        setIsProcessingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
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

  const starterPrompts = language === 'he'
    ? ['פגישה עם...', 'רעיונות לפרויקט...', 'לזכור להזמין...']
    : ['Meeting with...', 'Ideas for...', 'Remember to...'];

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-3xl mx-auto w-full py-4 md:py-8 px-4 md:px-6">
      {/* Personalized Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight font-serif italic text-white/95">
          {getGreeting()}{userName ? `, ${userName}` : ''}.
        </h1>
        <p className="text-white/60 text-sm sm:text-base font-light">
          {t.capturePrompt}
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-500/10 text-red-300 text-xs border border-red-500/20">
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Dominant Capture Surface */}
      <div className="relative flex flex-col rounded-3xl border border-white/15 bg-white/5 shadow-2xl overflow-hidden transition-all focus-within:border-white/30 backdrop-blur-md">
        <textarea
          ref={textareaRef}
          id="universal-capture-input"
          rows={3}
          dir={isRTL(detectContentLanguage(content)) ? 'rtl' : 'ltr'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleCapture();
            }
          }}
          placeholder={t.capturePlaceholder}
          className="w-full resize-none bg-transparent p-4 sm:p-6 text-base sm:text-xl font-light text-white/90 placeholder:text-white/20 focus:outline-none leading-relaxed"
        />

        {/* Action Controls & Subtext */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-white/[0.02] px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            {/* Voice capture button */}
            <button
              id="voice-capture-btn"
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessingAudio}
              className={`flex h-8.5 items-center gap-1.5 rounded-full px-3 text-xs font-medium border transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isProcessingAudio ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Transcribing...</span>
                </>
              ) : isRecording ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                  <span>{recordingTime}s</span>
                </>
              ) : (
                <>
                  <Mic size={13} />
                  <span className="hidden sm:inline">{t.voiceRecord}</span>
                </>
              )}
            </button>

            {/* Image upload button */}
            <label
              htmlFor="image-upload-input"
              className="flex h-8.5 items-center gap-1.5 rounded-full px-3 text-xs font-medium border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              {isProcessingImage ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ImageIcon size={13} />
              )}
              <span className="hidden sm:inline">{t.imageUpload}</span>
            </label>
            <input
              id="image-upload-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[11px] text-white/40 font-light">
              {t.captureSubtext}
            </span>

            {/* Primary Save Button */}
            <button
              id="capture-submit-btn"
              type="button"
              onClick={() => handleCapture()}
              disabled={!content.trim() || isCapturing}
              className="flex h-8.5 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-bold text-[#0C0C0C] hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
            >
              {isCapturing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={12} className="rtl:rotate-180" />
              )}
              <span>{t.captureBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Starter Prompts when input is empty */}
      {!content && (
        <div className="flex flex-wrap items-center gap-2">
          {starterPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setContent(prompt + ' ')}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-light text-white/50 hover:border-white/20 hover:text-white/80 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Post-Capture AI Review Section */}
      {lastCapturedNote && (
        <div className="flex flex-col gap-3 rounded-3xl border border-white/15 bg-white/5 p-4 sm:p-5 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <BookmarkCheck size={16} />
              <span>{t.savedToMemory}</span>
            </div>

            <button
              onClick={() => onOpenNote(lastCapturedNote.id!)}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <span>{language === 'he' ? 'פתח לעריכה' : 'Open in editor'}</span>
              <ArrowRight size={12} className="rtl:rotate-180" />
            </button>
          </div>

          <AISuggestionPanel
            insights={lastCapturedNote.aiInsights}
            currentTitle={lastCapturedNote.title}
            language={language}
            onApplyTitle={async (title) => {
              if (lastCapturedNote.id) {
                await onSaveNote({ id: lastCapturedNote.id, title });
                setLastCapturedNote((prev) => (prev ? { ...prev, title } : null));
              }
            }}
            onApplySummary={async (summary) => {
              if (lastCapturedNote.id) {
                await onSaveNote({ id: lastCapturedNote.id, summary });
                setLastCapturedNote((prev) => (prev ? { ...prev, summary } : null));
              }
            }}
            onAddTask={async (task) => {
              await onAddTask({
                title: task.title,
                dueDate: task.dueDate,
                priority: task.priority,
                noteId: lastCapturedNote.id,
              });
            }}
            onAddAllTasks={async (tasks) => {
              for (const task of tasks) {
                await onAddTask({
                  title: task.title,
                  dueDate: task.dueDate,
                  priority: task.priority,
                  noteId: lastCapturedNote.id,
                });
              }
            }}
            onAddTag={async (tag) => {
              if (lastCapturedNote.id) {
                const currentTags = lastCapturedNote.tagIds || [];
                if (!currentTags.includes(tag)) {
                  const updatedTags = [...currentTags, tag];
                  await onSaveNote({ id: lastCapturedNote.id, tagIds: updatedTags });
                  setLastCapturedNote((prev) => (prev ? { ...prev, tagIds: updatedTags } : null));
                }
              }
            }}
            onDismissTask={(taskId) => {
              setLastCapturedNote((prev) => {
                if (!prev || !prev.aiInsights) return prev;
                return {
                  ...prev,
                  aiInsights: {
                    ...prev.aiInsights,
                    tasks: prev.aiInsights.tasks.filter((t) => t.id !== taskId),
                  },
                };
              });
            }}
          />
        </div>
      )}

      {/* Grounded Recent Notes & Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Today's Tasks */}
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-xs text-white/70">
              <CheckSquare size={14} className="text-white/40" />
              <span>{t.tasks}</span>
            </div>
            {todayTasks.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                {todayTasks.length}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {todayTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 transition-all"
              >
                <span className="text-xs font-light text-white/90 truncate">
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className="text-[10px] text-white/40 whitespace-nowrap shrink-0">
                    {task.dueDate}
                  </span>
                )}
              </div>
            ))}

            {todayTasks.length === 0 && (
              <p className="text-xs text-white/30 font-light py-3">
                {t.emptyTasks}
              </p>
            )}
          </div>
        </div>

        {/* Recent Notes in Memory */}
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-xs text-white/70">
              <FileText size={14} className="text-white/40" />
              <span>{t.memory}</span>
            </div>
            {recentNotes.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                {recentNotes.length}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {recentNotes.slice(0, 3).map((note) => (
              <button
                key={note.id}
                onClick={() => onOpenNote(note.id!)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5 text-start hover:border-white/15 hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-light text-white/90 truncate">
                    {note.title || 'Untitled Note'}
                  </span>
                  <span className="text-[10px] text-white/40 truncate">
                    {note.summary || note.plainText.slice(0, 40) || '...'}
                  </span>
                </div>
                <span className="text-[10px] text-white/40 ms-2 whitespace-nowrap shrink-0">
                  {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </button>
            ))}

            {recentNotes.length === 0 && (
              <p className="text-xs text-white/30 font-light py-3">
                {t.emptyNotes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
