// Vercel Serverless Function: /api/investigate
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `You are TRACE, an expert AI financial investigator. 
You analyze payment anomalies and provide structured investigation reports.
Always respond with valid JSON matching the schema provided.`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ai-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, targetType, targetId, merchantId } = req.body;
    const apiKey = req.headers['x-ai-key'] || process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'AI API key not configured.' });
    if (!query && !targetId) return res.status(400).json({ error: 'Missing query or targetId' });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch context from Supabase
    let context = {};
    if (targetType && targetId) {
      if (targetType === 'settlement') {
        const { data } = await supabase.from('settlements').select('*').eq('settlement_id', targetId).single();
        context.entity = data;
        const { data: payments } = await supabase.from('payments').select('*').eq('settlement_id', targetId);
        context.payments = payments || [];
      } else if (targetType === 'payment') {
        const { data } = await supabase.from('payments').select('*').eq('payment_id', targetId).single();
        context.entity = data;
      } else if (targetType === 'exception') {
        const { data } = await supabase.from('exceptions').select('*').eq('exception_id', targetId).single();
        context.entity = data;
      } else if (targetType === 'incident') {
        const { data } = await supabase.from('incidents').select('*').eq('incident_id', targetId).single();
        context.entity = data;
      }
    }

    // Create investigation record
    const { data: invData } = await supabase.from('investigations').insert({
      merchant_id: merchantId || context.entity?.merchant_id || 'UNKNOWN',
      question: query || `Investigate ${targetType} ${targetId}`,
      target_entity_type: targetType,
      target_entity_id: targetId,
      status: 'planning'
    }).select('investigation_id').single();

    const invId = invData?.investigation_id || 'INV_SERVERLESS';

    // Run AI investigation
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Investigate this ${targetType} anomaly: ${targetId}
User Query: ${query || 'Perform a full investigation'}

Entity Data: ${JSON.stringify(context.entity || {}, null, 2)}
Related Payments: ${JSON.stringify(context.payments || [], null, 2)}

Provide a JSON investigation report with this structure:
{
  "summary": "2-3 sentence summary of what happened",
  "confidence": 85,
  "variance_amount": 5000,
  "evidence": [
    {"type": "financial", "description": "Description of evidence found", "severity": "HIGH"}
  ],
  "root_cause": "The root cause explanation",
  "recommended_action": "APPROVE_FIX or ESCALATE",
  "alternative_hypotheses": ["Alternative explanation 1"]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response
    let report;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      report = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: responseText, confidence: 70, evidence: [], recommended_action: 'ESCALATE' };
    } catch {
      report = { summary: responseText, confidence: 70, evidence: [], recommended_action: 'ESCALATE' };
    }

    // Update investigation record with findings
    await supabase.from('investigations').update({
      status: 'completed',
      ai_summary: report.summary,
      ai_confidence: report.confidence,
      recommended_action: report.recommended_action
    }).eq('investigation_id', invId);

    res.json({ ...report, investigation_id: invId });
  } catch (error) {
    console.error('Investigation error:', error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return res.status(429).json({ error: 'AI Rate Limit Exceeded. Please try again later or configure your own API key.' });
    }
    res.status(500).json({ error: error.message });
  }
}
