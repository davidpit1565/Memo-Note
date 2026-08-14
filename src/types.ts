export type Priority = 'low' | 'medium' | 'high';
export type AppLanguage = 'en' | 'he';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface NoteTask {
  id: string;
  title: string;
  dueDate?: string;
  priority: Priority;
  approved?: boolean;
  dismissed?: boolean;
}

export interface ExtractedDate {
  text: string;
  normalizedDate: string;
  confidence: number;
  label?: string;
}

export interface ExtractedEntity {
  name: string;
  confidence: number;
  role?: string;
}

export interface AIInsight {
  title?: string;
  summary?: string;
  tasks: NoteTask[];
  dates: ExtractedDate[];
  people: ExtractedEntity[];
  places: ExtractedEntity[];
  tags: string[];
  topics: string[];
  decisions: string[];
  questions: string[];
  importantFacts: string[];
  relatedConcepts: string[];
  language?: AppLanguage;
}

export interface NoteAttachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  size?: number;
  createdAt: number;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  plainText: string;
  folderId?: string;
  tagIds: string[];
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
  summary?: string;
  language?: AppLanguage;
  aiStatus?: 'idle' | 'analyzing' | 'ready' | 'error';
  aiUpdatedAt?: number;
  contentHash?: string;
  aiInsights?: AIInsight;
  attachments?: NoteAttachment[];
}

export interface Task {
  id?: number;
  noteId?: number;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: Priority;
  createdAt: number;
  completedAt?: number;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface ChatSource {
  noteId: number;
  title: string;
  snippet: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  mode: 'notes' | 'general';
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  userName?: string;
  hasCompletedOnboarding?: boolean;
  theme: ThemeMode;
  language: AppLanguage;
  autoAnalyze: boolean;
  enableTaskExtraction: boolean;
  enableTitleSuggestions: boolean;
  enableTagSuggestions: boolean;
  enableVoiceTranscription: boolean;
  enableImageVision: boolean;
}

export interface RelatedNoteResult {
  note: Note;
  reason: string;
  score: number;
}
