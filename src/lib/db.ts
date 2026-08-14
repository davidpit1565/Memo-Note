import Dexie, { type Table } from 'dexie';
import type { Note, Task, Folder, Tag, Conversation, ChatMessage, UserSettings } from '../types';

export class MemoDatabase extends Dexie {
  notes!: Table<Note, number>;
  tasks!: Table<Task, number>;
  folders!: Table<Folder, string>;
  tags!: Table<Tag, string>;
  conversations!: Table<Conversation, string>;
  messages!: Table<ChatMessage, string>;
  settings!: Table<UserSettings & { id: string }, string>;

  constructor() {
    super('MemoAI_Database');
    
    // Schema version 1
    this.version(1).stores({
      notes: '++id, title, folderId, *tagIds, isPinned, isArchived, isDeleted, createdAt, updatedAt, aiStatus',
      tasks: '++id, noteId, completed, dueDate, priority, createdAt',
      folders: 'id, name, createdAt',
      tags: 'id, name, createdAt',
      conversations: 'id, updatedAt, mode',
      messages: 'id, conversationId, createdAt',
      settings: 'id'
    });
  }
}

export const db = new MemoDatabase();

export const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  hasCompletedOnboarding: false,
  theme: 'system',
  language: 'en',
  autoAnalyze: true,
  enableTaskExtraction: true,
  enableTitleSuggestions: true,
  enableTagSuggestions: true,
  enableVoiceTranscription: true,
  enableImageVision: true
};

export async function getSettings(): Promise<UserSettings> {
  try {
    const record = await db.settings.get('user_settings');
    if (record) {
      const { id: _, ...settings } = record;
      return settings;
    }
    await db.settings.put({ ...DEFAULT_SETTINGS, id: 'user_settings' });
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await db.settings.put({ ...updated, id: 'user_settings' });
  return updated;
}
