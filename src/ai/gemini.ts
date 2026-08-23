import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY is missing. AI Investigation will fail.');
}

// Global Gemini client (Server side only)
export const ai = new GoogleGenAI({ apiKey: apiKey || 'missing' });
