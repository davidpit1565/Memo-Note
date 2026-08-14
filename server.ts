import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getAI, getFastModel, getReasoningModel } from './src/server/gemini';
import {
  NoteAnalysisSchema,
  ChatResponseSchema,
  CommandResponseSchema,
  VisionAnalysisSchema
} from './src/server/schemas';

// Standardized Error Sender
function sendAiError(
  res: express.Response,
  statusCode: number,
  code: 'INVALID_REQUEST' | 'AI_UNAVAILABLE' | 'AI_RATE_LIMITED' | 'AI_TIMEOUT' | 'AI_GENERATION_FAILED',
  message: string
) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

// Timeout Wrapper for Gemini calls
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 30000
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('AI request timed out');
      (err as any).isTimeout = true;
      reject(err);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

// Global AI Error Classifier
function handleAiError(err: any, res: express.Response, contextAction = 'process AI request') {
  console.error(`[AI Error in ${contextAction}]:`, err?.message || err);

  if (err?.isTimeout) {
    return sendAiError(res, 504, 'AI_TIMEOUT', 'The AI request timed out. Please try again.');
  }

  const errStr = (err?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode;

  if (
    status === 429 ||
    errStr.includes('429') ||
    errStr.includes('resource_exhausted') ||
    errStr.includes('quota') ||
    errStr.includes('rate limit')
  ) {
    return sendAiError(
      res,
      429,
      'AI_RATE_LIMITED',
      'MEMO AI is temporarily experiencing high demand. Please try again in a few moments.'
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return sendAiError(
      res,
      503,
      'AI_UNAVAILABLE',
      "MEMO couldn't reach its AI service because it is not configured."
    );
  }

  return sendAiError(
    res,
    500,
    'AI_GENERATION_FAILED',
    "MEMO couldn't complete the AI request. Please try again."
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Safe CORS Configuration for Web, Capacitor iOS, and Local Dev
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'https://localhost',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.APP_URL,
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : [])
    ].filter(Boolean);

    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://');

    if (isAllowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  app.use(express.json({ limit: '30mb' }));

  // Health check endpoint - safe for iOS verification without exposing secrets
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true
    });
  });

  // 1. Analyze Note Content
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { content, currentTitle, timezone = 'UTC', localTimeStr } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Content is required.');
      }

      if (content.length > 100000) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Content exceeds maximum allowed length.');
      }

      if (!process.env.GEMINI_API_KEY) {
        return sendAiError(res, 503, 'AI_UNAVAILABLE', "MEMO couldn't reach its AI service.");
      }

      const ai = getAI();
      const modelName = getFastModel();
      const refTime = localTimeStr || new Date().toISOString();

      const systemPrompt = `You are the intelligence engine of MEMO AI, a premium personal notes assistant.
Analyze the user's note carefully. The user may write in English, Hebrew, or mixed English/Hebrew.

Current Reference Time / Date for relative date calculations (e.g., today, tomorrow, Friday, next week): ${refTime} in timezone ${timezone}.

Extract and return a single valid JSON object strictly adhering to this structure:
{
  "title": "A crisp, meaningful suggested title (in the matching language). If currentTitle is already great, refine or keep it.",
  "summary": "1-2 sentence concise executive summary of the note.",
  "tasks": [
    {
      "title": "Clear actionable task title",
      "dueDate": "ISO date string or human readable due date (e.g. 2026-08-14T10:00:00 or 'Tomorrow 10:00')",
      "priority": "low" | "medium" | "high"
    }
  ],
  "dates": [
    {
      "text": "original date string found in text",
      "normalizedDate": "normalized ISO representation",
      "confidence": 0.95,
      "label": "e.g. Flight departure, Meeting, Birthday"
    }
  ],
  "people": [
    {
      "name": "Person name mentioned",
      "confidence": 0.9,
      "role": "e.g. Landlord, Colleague, Friend"
    }
  ],
  "places": [
    {
      "name": "Location, city, venue, or address mentioned",
      "confidence": 0.9
    }
  ],
  "tags": ["short", "lowercase", "tags", "maximum 5"],
  "topics": ["High level themes/projects mentioned"],
  "decisions": ["Any key decision made in the text"],
  "questions": ["Any unresolved question or inquiry in the text"],
  "importantFacts": ["Key numbers, prices, codes, or crucial facts"],
  "relatedConcepts": ["Concepts to help connect with other notes"],
  "language": "en" | "he"
}

Important Rules:
1. Support full Hebrew, English, and mixed slang (e.g. "צריך להתקשר לדוד מחר ב-10", "Book מלון ברומא").
2. For Hebrew text, provide suggestions in Hebrew where natural (title, tasks, summary).
3. Do not invent facts or dates that do not exist in the text.
4. Output ONLY the JSON object.`;

      const userPrompt = `Note Content:
${content}
${currentTitle ? `\nCurrent Note Title: ${currentTitle}` : ''}`;

      const aiPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const response = await executeWithTimeout(aiPromise, 30000);
      const responseText = response.text || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
      } catch (parseErr) {
        console.error('Failed to parse Gemini JSON output:', responseText);
        return sendAiError(res, 500, 'AI_GENERATION_FAILED', 'Invalid JSON response from AI model.');
      }

      const validated = NoteAnalysisSchema.parse(parsedData);
      return res.json(validated);
    } catch (error: any) {
      return handleAiError(error, res, 'analyze note');
    }
  });

  // 2. Ask Your Notes (RAG) & Conversational Chat
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const {
        query,
        history = [],
        contextNotes = [],
        mode = 'notes', // 'notes' | 'general'
        language = 'en',
      } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Query is required.');
      }

      if (query.length > 20000) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Query exceeds maximum allowed length.');
      }

      if (!process.env.GEMINI_API_KEY) {
        return sendAiError(res, 503, 'AI_UNAVAILABLE', "MEMO couldn't reach its AI service.");
      }

      const ai = getAI();
      const modelName = getReasoningModel();

      const validContextMap = new Map<number, any>();
      if (Array.isArray(contextNotes)) {
        contextNotes.forEach((n: any) => {
          if (typeof n.id === 'number') {
            validContextMap.set(n.id, n);
          }
        });
      }

      let systemInstruction = '';
      if (mode === 'notes') {
        systemInstruction = `You are MEMO AI's "Ask Your Notes" assistant.
You answer user questions strictly and ONLY using the provided retrieved notes context.

CRITICAL SAFETY & TRUTH RULES:
1. You must answer ONLY using verified information found in the retrieved notes provided below.
2. If the answer or fact is NOT explicitly or implicitly found in the retrieved notes, you MUST clearly state:
   "I couldn't find that information in your notes." (or in Hebrew: "לא מצאתי מידע זה ברשימות שלך." if the query or language is Hebrew).
3. NEVER fabricate or hallucinate facts, phone numbers, prices, or dates.
4. When you provide an answer using notes, you MUST cite the specific note ID(s) you derived the answer from in the citedSourceIds array.
5. You must ONLY cite note IDs that were provided in the Context Notes section.

Return a JSON object in this exact format:
{
  "answer": "Your comprehensive, clear, and direct answer based on the notes (in markdown format)",
  "citedSourceIds": [1, 2] // array of integer Note IDs used
}`;
      } else {
        systemInstruction = `You are MEMO AI, an intelligent personal knowledge assistant.
Answer the user's question clearly, concisely, and helpfully.
Return a JSON object:
{
  "answer": "Your answer in markdown format",
  "citedSourceIds": []
}`;
      }

      const formattedContext = contextNotes && contextNotes.length > 0
        ? contextNotes.map((n: any) => {
            return `--- NOTE ID: ${n.id} ---
Title: ${n.title || 'Untitled'}
Date: ${new Date(n.updatedAt || n.createdAt || Date.now()).toLocaleDateString()}
Tags: ${(n.tags || []).join(', ')}
Summary: ${n.summary || ''}
Content:
${n.plainText || n.content || ''}
-------------------------`;
          }).join('\n\n')
        : '(No matching notes retrieved for this query)';

      let formattedHistory = '';
      if (Array.isArray(history) && history.length > 0) {
        formattedHistory = 'Previous Conversation:\n' + history.slice(-6).map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\n\n';
      }

      const prompt = `${formattedHistory}Context Notes:
${formattedContext}

User Query: ${query}
Target Language: ${language}

Provide your structured JSON response:`;

      const aiPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const response = await executeWithTimeout(aiPromise, 30000);
      const responseText = response.text || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
      } catch (parseErr) {
        parsedData = { answer: responseText, citedSourceIds: [] };
      }

      const validated = ChatResponseSchema.parse(parsedData);
      const filteredSources = validated.citedSourceIds.filter((id) => validContextMap.has(id));

      return res.json({
        answer: validated.answer,
        citedSourceIds: filteredSources,
      });
    } catch (error: any) {
      return handleAiError(error, res, 'ask notes chat');
    }
  });

  // 3. AI Command (Summarize, Rewrite, Shorten, Expand, Fix Grammar, Extract Tasks, Checklist, Explain)
  app.post('/api/ai/command', async (req, res) => {
    try {
      const { command, text, contextTitle, instruction } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Text is required.');
      }

      if (text.length > 100000) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Text exceeds maximum allowed length.');
      }

      if (!process.env.GEMINI_API_KEY) {
        return sendAiError(res, 503, 'AI_UNAVAILABLE', "MEMO couldn't reach its AI service.");
      }

      const ai = getAI();
      const modelName = getFastModel();

      const systemPrompt = `You are the writing and transformation engine of MEMO AI.
You execute user-requested editorial commands on note content.
Maintain the original language (English or Hebrew) and tone unless instructed otherwise.

Requested Command: ${command}
${instruction ? `Specific Instruction: ${instruction}` : ''}

Output a JSON object with:
{
  "resultText": "The transformed or generated text",
  "explanation": "Brief 1-sentence note of what was changed"
}`;

      const aiPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nNote Title: ${contextTitle || 'Untitled'}\nSelected Text:\n${text}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const response = await executeWithTimeout(aiPromise, 30000);
      const responseText = response.text || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
      } catch (parseErr) {
        parsedData = { resultText: responseText, explanation: '' };
      }

      const validated = CommandResponseSchema.parse(parsedData);
      return res.json(validated);
    } catch (error: any) {
      return handleAiError(error, res, 'execute command');
    }
  });

  // 4. Vision (Image OCR & Analysis)
  app.post('/api/ai/vision', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'imageBase64 is required.');
      }

      if (imageBase64.length > 35 * 1024 * 1024) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Image exceeds maximum allowed size (25MB).');
      }

      if (!process.env.GEMINI_API_KEY) {
        return sendAiError(res, 503, 'AI_UNAVAILABLE', "MEMO couldn't reach its AI service.");
      }

      const ai = getAI();
      const modelName = getFastModel();

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const prompt = `Analyze this image for MEMO AI. It may contain handwritten notes, printed documents, receipts, whiteboard sessions, or real-world text.
Transcribe the content accurately and extract structured metadata.

Return a JSON object:
{
  "transcribedText": "Full transcription and detailed description of the document/image in markdown",
  "title": "Suggested note title based on image content",
  "summary": "1-2 sentence summary of what this image documents",
  "tasks": [
    {
      "title": "Actionable task discovered",
      "dueDate": "e.g. 2026-08-15 or relative date",
      "priority": "low" | "medium" | "high"
    }
  ],
  "tags": ["extracted", "tags"]
}`;

      const aiPromise = ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const response = await executeWithTimeout(aiPromise, 35000);
      const responseText = response.text || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
      } catch (parseErr) {
        parsedData = { transcribedText: responseText, title: 'Image Note', summary: '', tasks: [], tags: [] };
      }

      const validated = VisionAnalysisSchema.parse(parsedData);
      return res.json(validated);
    } catch (error: any) {
      return handleAiError(error, res, 'vision analysis');
    }
  });

  // 5. Transcribe Audio (Voice Recording to Note)
  app.post('/api/ai/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body;
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'audioBase64 is required.');
      }

      if (audioBase64.length > 35 * 1024 * 1024) {
        return sendAiError(res, 400, 'INVALID_REQUEST', 'Audio recording exceeds maximum allowed size.');
      }

      if (!process.env.GEMINI_API_KEY) {
        return sendAiError(res, 503, 'AI_UNAVAILABLE', "MEMO couldn't reach its AI service.");
      }

      const ai = getAI();
      const modelName = getFastModel();

      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');

      const prompt = `You are MEMO AI's audio transcription and intelligence engine.
Listen carefully to this audio recording (which could be in English, Hebrew, or mixed).
Transcribe it accurately word-for-word, preserving the natural flow, and extract key action items and structure.

Return a JSON object:
{
  "transcription": "Verbatim clean transcript of the audio recording",
  "title": "Suggested crisp title",
  "summary": "1 sentence executive summary",
  "tasks": [
    {
      "title": "Extracted task",
      "dueDate": "relative or specific due date",
      "priority": "low" | "medium" | "high"
    }
  ],
  "tags": ["voice-note", "tag2"]
}`;

      const aiPromise = ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const response = await executeWithTimeout(aiPromise, 35000);
      const responseText = response.text || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
      } catch (parseErr) {
        parsedData = { transcription: responseText, title: 'Voice Note', summary: '', tasks: [], tags: ['voice-note'] };
      }

      return res.json(parsedData);
    } catch (error: any) {
      return handleAiError(error, res, 'audio transcription');
    }
  });

  // 6. Calculate Real Related Notes
  app.post('/api/ai/related', async (req, res) => {
    try {
      const { targetNote, candidateNotes = [] } = req.body;
      if (!targetNote || !Array.isArray(candidateNotes) || candidateNotes.length === 0) {
        return res.json({ related: [] });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ related: [] });
      }

      const ai = getAI();
      const modelName = getFastModel();

      const candidatesList = candidateNotes.slice(0, 15).map((c: any) => ({
        id: c.id,
        title: c.title,
        tags: c.tags || [],
        summary: c.summary || '',
        snippet: (c.plainText || c.content || '').slice(0, 300)
      }));

      const prompt = `Identify which of the candidate notes are genuinely related to the target note.
Analyze shared entities, projects, people, places, topics, or underlying concepts.

Target Note:
Title: ${targetNote.title}
Tags: ${(targetNote.tags || []).join(', ')}
Content: ${(targetNote.plainText || targetNote.content || '').slice(0, 600)}

Candidate Notes:
${JSON.stringify(candidatesList, null, 2)}

Return a JSON array of maximum 4 related notes that have a genuine connection:
[
  {
    "id": 123, // matching Candidate Note id
    "reason": "Specific reason why they are connected (e.g., Both discuss the apartment rental contract and deposit terms)",
    "score": 0.85 // relevance between 0.5 and 1.0
  }
]
If there are no genuinely related notes, return an empty array []. Never fabricate relationships.`;

      const aiPromise = ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });

      const response = await executeWithTimeout(aiPromise, 25000);
      const responseText = response.text || '[]';
      let related = [];
      try {
        related = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
      } catch {
        related = [];
      }

      return res.json({ related: Array.isArray(related) ? related : [] });
    } catch (error: any) {
      console.error('Error in AI related route:', error?.message || error);
      return res.json({ related: [] });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MEMO AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
