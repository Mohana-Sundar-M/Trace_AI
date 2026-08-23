// @ts-nocheck
import { Router } from 'express';
import { ai as defaultAi } from '../../ai/gemini.js';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const model = 'gemini-3.6-flash';

import WebSocket from 'ws';
// @ts-ignore
globalThis.WebSocket = WebSocket;

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { WebSocket: WebSocket }
});

const INTENT_SYSTEM_PROMPT = `
You are TRACE, a Financial Operations AI.
The user is asking a natural language query. You must extract the intent and the exact entity ID (if any) they are referring to.

Valid Intents:
- INVESTIGATE_ENTITY (e.g. "What happened to PAY_123?", "Why did SETL_456 fail?")
- QUERY_METRICS (e.g. "What is our success rate?", "Show me open exceptions")
- EXPLAIN_PROCESS (e.g. "How do refunds work?", "What is settlement variance?")

Output JSON format strictly:
{
  "intent": "INVESTIGATE_ENTITY" | "QUERY_METRICS" | "EXPLAIN_PROCESS" | "UNKNOWN",
  "entityType": "payment" | "settlement" | "refund" | "exception" | "incident" | null,
  "entityId": "string" | null,
  "directResponse": "string" // if intent is QUERY_METRICS or EXPLAIN_PROCESS, provide a short answer here.
}
`;

router.post('/', async (req, res) => {
  try {
    const { query, merchantId } = req.body;
    const apiKey = req.headers['x-ai-key'] as string;
    
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Use custom AI client if API key is provided, else fallback to default
    const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : defaultAi;

    // Try AI Intent extraction
    let aiResult;
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: query }] }],
        config: {
          systemInstruction: INTENT_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });
      aiResult = JSON.parse(response.text || '{}');
    } catch (e: any) {
      if (e.status === 429) {
        // Rate limit fallback: use regex to extract ID
        const match = query.match(/(PAY|SETL|EXC|INC|ORD|REF)_[A-Z0-9]+/);
        if (match) {
          const id = match[0];
          const typeMap: Record<string, string> = {
            'PAY': 'payment',
            'SETL': 'settlement',
            'EXC': 'exception',
            'INC': 'incident',
            'ORD': 'order',
            'REF': 'refund'
          };
          const prefix = id.split('_')[0];
          aiResult = {
            intent: 'INVESTIGATE_ENTITY',
            entityType: typeMap[prefix] || 'unknown',
            entityId: id,
            directResponse: 'AI unavailable. Using deterministic ID extraction.'
          };
        } else {
          return res.json({
            action: 'REPLY',
            message: 'I am currently operating in deterministic-only mode due to API rate limits. Please provide a specific ID (e.g. PAY_123) to investigate.'
          });
        }
      } else {
        throw e;
      }
    }

    if (aiResult.intent === 'INVESTIGATE_ENTITY' && aiResult.entityId && aiResult.entityType) {
      return res.json({
        action: 'REDIRECT',
        route: `/investigations/${aiResult.entityType}/${aiResult.entityId}`
      });
    }

    if (aiResult.intent === 'QUERY_METRICS') {
      return res.json({
        action: 'REDIRECT',
        route: `/operations`
      });
    }

    // Default reply
    res.json({
      action: 'REPLY',
      message: aiResult.directResponse || "I couldn't identify a specific entity. Try asking 'Investigate PAY_123'."
    });

  } catch (error: any) {
    console.error('Ask TRACE Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
