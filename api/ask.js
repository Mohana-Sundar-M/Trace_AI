// Vercel Serverless Function: /api/ask
import { GoogleGenerativeAI } from '@google/generative-ai';

const INTENT_SYSTEM_PROMPT = `You are TRACE, a Financial Operations AI.
The user is asking a natural language query. You must extract the intent and the exact entity ID (if any).

Valid Intents:
- INVESTIGATE_ENTITY (e.g. "What happened to PAY_123?", "Why did SETL_456 fail?")
- QUERY_METRICS (e.g. "What is our success rate?", "Show me open exceptions")
- EXPLAIN_PROCESS (e.g. "How do refunds work?", "What is settlement variance?")

Output JSON format strictly:
{
  "intent": "INVESTIGATE_ENTITY" | "QUERY_METRICS" | "EXPLAIN_PROCESS" | "UNKNOWN",
  "entityType": "payment" | "settlement" | "refund" | "exception" | "incident" | null,
  "entityId": "string" | null,
  "directResponse": "string"
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ai-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query } = req.body;
    const apiKey = req.headers['x-ai-key'] || process.env.GEMINI_API_KEY;

    if (!query) return res.status(400).json({ error: 'Query required' });

    // Deterministic ID extraction first (no AI needed)
    const idMatch = query.match(/(PAY|SETL|EXC|INC|ORD|REF)_[A-Z0-9]+/);
    if (idMatch) {
      const id = idMatch[0];
      const typeMap = { PAY: 'payment', SETL: 'settlement', EXC: 'exception', INC: 'incident', ORD: 'order', REF: 'refund' };
      const prefix = id.split('_')[0];
      return res.json({
        action: 'REDIRECT',
        route: `/investigations/${typeMap[prefix] || 'payment'}/${id}`
      });
    }

    // Use AI for intent parsing
    if (!apiKey) {
      return res.json({ action: 'REPLY', message: "Please configure your Gemini API key to use natural language queries. You can also search by entity ID (e.g. PAY_123, SETL_456)." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: query }] }],
      systemInstruction: INTENT_SYSTEM_PROMPT,
    });

    const responseText = result.response.text();
    let aiResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
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
      message: aiResult.directResponse || "I couldn't identify a specific entity. Try asking 'Investigate PAY_123'."
    });

  } catch (error) {
    console.error('Ask TRACE Error:', error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return res.json({ action: 'REPLY', message: 'AI rate limit reached. Try searching by entity ID like PAY_123 or SETL_456.' });
    }
    res.status(500).json({ error: error.message });
  }
}
