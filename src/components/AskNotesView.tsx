import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  MessageSquare,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { Note, Conversation, ChatMessage, AppLanguage } from '../types';
import { TRANSLATIONS } from '../lib/i18n';
import { AIService } from '../lib/ai-service';
import { weightedLocalRetrieval } from '../lib/retrieval';
import { db } from '../lib/db';

interface AskNotesViewProps {
  notes: Note[];
  language: AppLanguage;
  onOpenNote: (noteId: number) => void;
}

export const AskNotesView: React.FC<AskNotesViewProps> = ({
  notes,
  language,
  onOpenNote,
}) => {
  const t = TRANSLATIONS[language];
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'notes' | 'general'>('notes');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load past conversations from Dexie
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const list = await db.conversations.orderBy('updatedAt').reverse().toArray();
    setConversations(list);
    if (list.length > 0 && !activeConvId) {
      selectConversation(list[0].id);
    } else if (list.length === 0) {
      createNewConversation();
    }
  };

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    const msgs = await db.messages.where('conversationId').equals(convId).sortBy('createdAt');
    setMessages(msgs);
    const conv = await db.conversations.get(convId);
    if (conv) setMode(conv.mode);
  };

  const createNewConversation = async () => {
    const newId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: language === 'he' ? 'שאילתה חדשה' : 'New Question',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode,
    };
    await db.conversations.put(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
    setMessages([]);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.conversations.delete(convId);
    await db.messages.where('conversationId').equals(convId).delete();
    const updated = conversations.filter((c) => c.id !== convId);
    setConversations(updated);
    if (activeConvId === convId) {
      if (updated.length > 0) {
        selectConversation(updated[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle Query Submission
  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isGenerating) return;

    let convId = activeConvId;
    if (!convId) {
      convId = `conv_${Date.now()}`;
      const newConv: Conversation = {
        id: convId,
        title: q.slice(0, 35),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode,
      };
      await db.conversations.put(newConv);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(convId);
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      conversationId: convId,
      role: 'user',
      content: q,
      createdAt: Date.now(),
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInputQuery('');
    setIsGenerating(true);
    setErrorMessage(null);
    await db.messages.put(userMsg);

    try {
      // 1. Retrieve most relevant notes using Weighted Local Retrieval
      let contextNotes: any[] = [];
      if (mode === 'notes') {
        const scored = weightedLocalRetrieval(notes, q, { maxResults: 8, minScore: 0.1 });
        contextNotes = scored.map((s) => ({
          noteId: s.note.id,
          title: s.note.title,
          content: s.note.plainText,
          summary: s.note.summary,
          date: new Date(s.note.updatedAt || s.note.createdAt).toLocaleDateString(),
        }));
      }

      // 2. Call server-side Ask Notes endpoint
      const response = await AIService.askNotes({
        query: q,
        mode,
        contextNotes,
        history: newMsgs.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      });

      const matchedSources = (response.citedSourceIds || [])
        .map((id) => contextNotes.find((n) => n.noteId === id))
        .filter(Boolean)
        .map((cn) => ({
          noteId: cn.noteId,
          title: cn.title || 'Note',
          snippet: (cn.summary || cn.content || '').slice(0, 100),
          date: cn.date || '',
        }));

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        conversationId: convId,
        role: 'assistant',
        content: response.answer,
        sources: matchedSources.length > 0 ? matchedSources : undefined,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await db.messages.put(assistantMsg);

      // Update conversation title if first query
      if (messages.length === 0) {
        await db.conversations.update(convId, {
          title: q.slice(0, 35),
          updatedAt: Date.now(),
        });
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: q.slice(0, 35), updatedAt: Date.now() } : c))
        );
      }
    } catch (err: any) {
      console.error('Ask Notes query error:', err);
      setErrorMessage(err?.message || 'Failed to retrieve answer from memory.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate dynamic sample questions from actual notes
  const sampleQuestions = React.useMemo(() => {
    if (notes.length === 0) {
      return language === 'he'
        ? ['מה המשימות החשובות שלי השבוע?', 'סכם לי את הרעיונות האחרונים שרשמתי.']
        : ['What are my upcoming priorities?', 'Summarize my recent thoughts.'];
    }

    const firstNote = notes[0];
    const secondNote = notes[1];

    if (language === 'he') {
      const q: string[] = [];
      if (firstNote?.title) q.push(`מה סיכמתי בפתק "${firstNote.title}"?`);
      if (secondNote?.title) q.push(`אילו משימות קשורות ל"${secondNote.title}"?`);
      q.push('אילו נושאים מרכזיים מופיעים ברשימות שלי?');
      return q;
    }

    const q: string[] = [];
    if (firstNote?.title) q.push(`What did I write in "${firstNote.title}"?`);
    if (secondNote?.title) q.push(`What action items are linked to "${secondNote.title}"?`);
    q.push('What are the key themes across my notes?');
    return q;
  }, [notes, language]);

  return (
    <div className="flex h-full w-full overflow-hidden text-white">
      {/* Sidebar Threads List */}
      <aside className="hidden md:flex flex-col w-64 border-e border-white/10 bg-white/[0.02] p-3 justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">{t.askMemo}</span>
            <button
              onClick={createNewConversation}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="New Question"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-2xl text-xs cursor-pointer transition-colors ${
                  activeConvId === c.id
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare size={13} className="shrink-0 text-white/40" />
                  <span className="truncate">{c.title}</span>
                </div>

                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 rounded-full transition-opacity cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-white/30 p-2 border-t border-white/5 font-light">
          {language === 'he' ? 'מבוסס ישירות על הזיכרון שלך' : 'Grounded directly in your memory'}
        </div>
      </aside>

      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0C0C0C]">
        {/* Top Header Controls Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 bg-[#0C0C0C]">
          <div className="flex items-center gap-2">
            <button
              onClick={createNewConversation}
              className="md:hidden p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="New Question"
            >
              <Plus size={14} />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {t.askMemo}
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 sm:p-1 rounded-full">
            <button
              onClick={() => setMode('notes')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                mode === 'notes'
                  ? 'bg-white text-[#0C0C0C] font-semibold'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {t.myNotesMode}
            </button>
            <button
              onClick={() => setMode('general')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                mode === 'general'
                  ? 'bg-white text-[#0C0C0C] font-semibold'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {t.generalAiMode}
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 max-w-2xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center my-auto text-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white">
                <Sparkles size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-light tracking-tight font-serif italic text-white/95">
                  {t.emptyAskHeading}
                </h3>
                <p className="text-xs sm:text-sm text-white/40 max-w-md font-light leading-relaxed">
                  {t.emptyAskSub}
                </p>
              </div>

              {/* Dynamic Sample prompt pills */}
              <div className="flex flex-col gap-2 w-full max-w-md mt-2">
                {sampleQuestions.map((sq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(sq)}
                    className="p-3 rounded-2xl border border-white/10 hover:border-white/20 bg-white/5 text-xs text-white/80 text-start hover:bg-white/10 transition-all font-light cursor-pointer"
                  >
                    "{sq}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-4 md:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-white text-[#0C0C0C] font-medium'
                    : 'bg-white/5 text-white/95 border border-white/10 font-light'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Sources Citation Bar */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{t.sources}:</span>
                  {msg.sources.map((src) => (
                    <button
                      key={src.noteId}
                      onClick={() => onOpenNote(src.noteId)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-0.5 text-[10px] font-medium text-white/70 hover:border-white/20 hover:text-white transition-colors cursor-pointer"
                    >
                      <FileText size={10} />
                      <span className="truncate max-w-[120px] font-serif italic">{src.title || 'Note'}</span>
                      <ExternalLink size={9} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 p-3 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs w-fit">
              <Loader2 size={13} className="animate-spin text-white" />
              <span className="font-light">
                {language === 'he' ? 'מחפש בזיכרון ומנסח תשובה...' : 'Consulting your memory...'}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 text-red-300 text-xs border border-red-500/20">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/10 p-3 sm:p-4 bg-[#0C0C0C] max-w-2xl mx-auto w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center"
          >
            <input
              id="ask-notes-input"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={t.askPlaceholder}
              disabled={isGenerating}
              className="w-full rounded-full border border-white/15 bg-white/5 py-3 ps-4 pe-12 sm:py-3.5 sm:ps-5 sm:pe-14 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 shadow-lg transition-all font-light"
            />
            <button
              id="ask-submit-btn"
              type="submit"
              disabled={!inputQuery.trim() || isGenerating}
              className="absolute end-2 p-2 sm:p-2.5 rounded-full bg-white text-[#0C0C0C] hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
            >
              <Send size={13} className="rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
