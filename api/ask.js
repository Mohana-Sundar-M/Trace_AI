// Vercel Serverless Function: /api/ask
import { GoogleGenAI } from '@google/genai';

const INTENT_SYSTEM_PROMPT = `You are TRACE, a Financial Operations AI.
The user is asking a natural language query. Extract the intent and entity ID.

Output JSON strictly:
{
  "intent": "INVESTIGATE_ENTITY" | "QUERY_METRICS" | "EXPLAIN_PROCESS" | "UNKNOWN",
  "entityType": "payment" | "settlement" | "refund" | "exception" | "incident" | null,
  "entityId": "string or null",
  "directResponse": "short answer if not investigating an entity"
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ai-key, X-AI-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query } = req.body;
    const apiKey = req.headers['x-ai-key'] || req.headers['X-AI-Key'] || process.env.GEMINI_API_KEY;

    if (!query) return res.status(400).json({ error: 'Query required' });

    // Always try deterministic ID extraction first — no AI needed
    const idMatch = query.match(/(PAY|SETL|EXC|INC|ORD|REF)_[A-Z0-9]+/i);
    if (idMatch) {
      const id = idMatch[0].toUpperCase();
      const typeMap = { PAY: 'payment', SETL: 'settlement', EXC: 'exception', INC: 'incident', ORD: 'order', REF: 'refund' };
      const prefix = id.split('_')[0];
      return res.json({
        action: 'REDIRECT',
        route: `/investigations/${typeMap[prefix] || 'payment'}/${id}`
      });
    }

    // Keyword-based routing — no AI needed
    const q = query.toLowerCase();
    if (q.includes('exception') || q.includes('anomaly')) return res.json({ action: 'REDIRECT', route: '/exceptions' });
    if (q.includes('settlement') || q.includes('variance')) return res.json({ action: 'REDIRECT', route: '/reconciliation' });
    if (q.includes('payment') || q.includes('success rate')) return res.json({ action: 'REDIRECT', route: '/payments' });
    if (q.includes('incident')) return res.json({ action: 'REDIRECT', route: '/incidents' });
    if (q.includes('refund')) return res.json({ action: 'REDIRECT', route: '/refunds' });
    if (q.includes('dispute')) return res.json({ action: 'REDIRECT', route: '/disputes' });

    // Use AI for complex intent parsing
    if (!apiKey) {
      return res.json({
        action: 'REPLY',
        message: 'No AI key configured. You can search by entity ID (e.g. PAY_123, SETL_456) or navigate using the sidebar. Configure your Gemini API key on the dashboard for natural language search.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: {
        systemInstruction: INTENT_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    let aiResult = {};
    try {
      const text = response.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      aiResult = {};
    }

    if (aiResult.intent === 'INVESTIGATE_ENTITY' && aiResult.entityId && aiResult.entityType) {
      return res.json({
        action: 'REDIRECT',
        route: `/investigations/${aiResult.entityType}/${aiResult.entityId}`
      });
    }
    if (aiResult.intent === 'QUERY_METRICS') {
      return res.json({ action: 'REDIRECT', route: '/operations' });
    }

    res.json({
      action: 'REPLY',
      message: aiResult.directResponse || "I couldn't identify a specific entity. Try searching by ID like 'Investigate PAY_123'."
    });

  } catch (error) {
    console.error('Ask TRACE Error:', error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return res.json({ action: 'REPLY', message: 'AI rate limit reached. Search by entity ID like PAY_123 or SETL_456.' });
    }
    res.status(500).json({ error: error.message });
  }
}
