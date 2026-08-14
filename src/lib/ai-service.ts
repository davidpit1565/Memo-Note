import type { AIInsight, RelatedNoteResult, Note } from '../types';

export interface AnalyzeNoteResponse extends AIInsight {
  title?: string;
  summary?: string;
}

export interface ChatResponse {
  answer: string;
  citedSourceIds: number[];
}

export interface CommandResponse {
  resultText: string;
  explanation?: string;
}

export interface VisionResponse {
  transcribedText: string;
  title: string;
  summary: string;
  tasks: Array<{ title: string; dueDate?: string; priority: 'low' | 'medium' | 'high' }>;
  tags: string[];
}

export interface TranscribeResponse {
  transcription: string;
  title?: string;
  summary?: string;
  tasks?: Array<{ title: string; dueDate?: string; priority: 'low' | 'medium' | 'high' }>;
  tags?: string[];
}

// Configurable API base URL for Web, Dev, and Native iOS (via VITE_API_BASE_URL)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function getApiUrl(endpoint: string): string {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanPath}`;
}

async function extractErrorMessage(response: Response, defaultMessage: string): Promise<string> {
  try {
    const errorData = await response.json();
    if (errorData?.error?.message) {
      return errorData.error.message;
    }
    if (typeof errorData?.error === 'string') {
      return errorData.error;
    }
    if (errorData?.message) {
      return errorData.message;
    }
  } catch {
    // Ignore JSON parse error and use default
  }
  return `${defaultMessage} (${response.status} ${response.statusText})`.trim();
}

export const AIService = {
  async checkHealth(): Promise<{ ok: boolean }> {
    try {
      const res = await fetch(getApiUrl('/api/health'));
      if (!res.ok) return { ok: false };
      const data = await res.json();
      return { ok: !!data.ok };
    } catch {
      return { ok: false };
    }
  },

  async analyzeNote(params: {
    content: string;
    currentTitle?: string;
    timezone?: string;
    localTimeStr?: string;
  }): Promise<AnalyzeNoteResponse> {
    const tz = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const localTimeStr = params.localTimeStr || new Date().toLocaleString();

    try {
      const response = await fetch(getApiUrl('/api/ai/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: params.content,
          currentTitle: params.currentTitle,
          timezone: tz,
          localTimeStr: localTimeStr,
        }),
      });

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response, 'AI analysis failed');
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error("MEMO couldn't connect to the AI service. Please check your network connection.");
      }
      throw err;
    }
  },

  async askNotes(params: {
    query: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    contextNotes: Array<{
      id: number;
      title: string;
      plainText: string;
      summary?: string;
      tags?: string[];
      updatedAt?: number;
      createdAt?: number;
    }>;
    mode?: 'notes' | 'general';
    language?: 'en' | 'he';
  }): Promise<ChatResponse> {
    try {
      const response = await fetch(getApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response, 'AI chat failed');
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error("MEMO couldn't connect to the AI service. Please check your network connection.");
      }
      throw err;
    }
  },

  async executeCommand(params: {
    command: string;
    text: string;
    contextTitle?: string;
    instruction?: string;
  }): Promise<CommandResponse> {
    try {
      const response = await fetch(getApiUrl('/api/ai/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response, 'Command execution failed');
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error("MEMO couldn't connect to the AI service. Please check your network connection.");
      }
      throw err;
    }
  },

  async analyzeVision(imageBase64: string, mimeType = 'image/jpeg'): Promise<VisionResponse> {
    try {
      const response = await fetch(getApiUrl('/api/ai/vision'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response, 'Vision analysis failed');
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error("MEMO couldn't connect to the AI service. Please check your network connection.");
      }
      throw err;
    }
  },

  async transcribeAudio(audioBase64: string, mimeType = 'audio/webm'): Promise<TranscribeResponse> {
    try {
      const response = await fetch(getApiUrl('/api/ai/transcribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response, 'Audio transcription failed');
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error("MEMO couldn't connect to the AI service. Please check your network connection.");
      }
      throw err;
    }
  },

  async findRelatedNotes(targetNote: Note, candidateNotes: Note[]): Promise<{ related: Array<{ id: number; reason: string; score: number }> }> {
    try {
      const response = await fetch(getApiUrl('/api/ai/related'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetNote, candidateNotes }),
      });

      if (!response.ok) return { related: [] };
      return await response.json();
    } catch {
      return { related: [] };
    }
  }
};
