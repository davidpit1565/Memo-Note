import { db } from './db';
import type { Note } from '../types';

export async function exportAllNotesJSON(): Promise<string> {
  const notes = await db.notes.toArray();
  const tasks = await db.tasks.toArray();
  const folders = await db.folders.toArray();
  const tags = await db.tags.toArray();

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes,
    tasks,
    folders,
    tags,
  };

  return JSON.stringify(data, null, 2);
}

export function exportNoteAsMarkdown(note: Note): string {
  const parts: string[] = [];
  parts.push(`# ${note.title || 'Untitled Note'}`);
  parts.push(`*Created: ${new Date(note.createdAt).toLocaleString()}*`);
  if (note.summary) {
    parts.push(`> **Summary:** ${note.summary}`);
  }
  if (note.tagIds && note.tagIds.length > 0) {
    parts.push(`**Tags:** ${note.tagIds.map((t) => `#${t}`).join(' ')}`);
  }
  parts.push('\n---\n');
  parts.push(note.content || '');

  if (note.aiInsights?.tasks && note.aiInsights.tasks.length > 0) {
    parts.push('\n### Action Items');
    for (const task of note.aiInsights.tasks) {
      parts.push(`- [ ] ${task.title}${task.dueDate ? ` *(Due: ${task.dueDate})*` : ''}`);
    }
  }

  return parts.join('\n\n');
}

export function exportNoteAsTXT(note: Note): string {
  return `${note.title || 'Untitled Note'}\nDate: ${new Date(note.createdAt).toLocaleString()}\n\n${note.plainText || note.content || ''}`;
}

export async function importNotesFromJSON(jsonString: string): Promise<{ importedCount: number }> {
  const data = JSON.parse(jsonString);
  let count = 0;

  if (Array.isArray(data.notes)) {
    for (const n of data.notes) {
      const { id: _, ...noteData } = n;
      await db.notes.add({
        ...noteData,
        createdAt: noteData.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      });
      count++;
    }
  }

  return { importedCount: count };
}
