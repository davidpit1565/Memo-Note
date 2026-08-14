import { z } from 'zod';

export const NoteAnalysisSchema = z.object({
  title: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  tasks: z.array(
    z.object({
      title: z.string(),
      dueDate: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).default('medium')
    })
  ).default([]),
  dates: z.array(
    z.object({
      text: z.string(),
      normalizedDate: z.string().default(''),
      confidence: z.number().default(0.9),
      label: z.string().optional()
    })
  ).default([]),
  people: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().default(0.9),
      role: z.string().optional()
    })
  ).default([]),
  places: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().default(0.9)
    })
  ).default([]),
  tags: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  importantFacts: z.array(z.string()).default([]),
  relatedConcepts: z.array(z.string()).default([]),
  language: z.enum(['en', 'he']).default('en')
});

export const ChatResponseSchema = z.object({
  answer: z.string(),
  citedSourceIds: z.array(z.number()).default([])
});

export const CommandResponseSchema = z.object({
  resultText: z.string(),
  explanation: z.string().optional().default('')
});

export const VisionAnalysisSchema = z.object({
  transcribedText: z.string(),
  title: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  tasks: z.array(
    z.object({
      title: z.string(),
      dueDate: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).default('medium')
    })
  ).default([]),
  tags: z.array(z.string()).default([])
});
