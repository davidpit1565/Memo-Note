import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not set. AI capabilities will be unavailable until configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export function getFastModel(): string {
  return process.env.GEMINI_MODEL_FAST || 'gemini-3.7-flash';
}

export function getReasoningModel(): string {
  return process.env.GEMINI_MODEL_REASONING || 'gemini-3.7-flash';
}
