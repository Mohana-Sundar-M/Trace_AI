// Vercel Serverless Function: /api/investigate
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ai-key, X-AI-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, targetType, targetId, merchantId } = req.body;
    const apiKey = req.headers['x-ai-key'] || req.headers['X-AI-Key'] || process.env.GEMINI_API_KEY;

    if (!targetType && !query) {
      return res.status(400).json({ error: 'Missing required fields: targetType or query' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables not configured on Vercel.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch context from Supabase
    let entity = null;
    let relatedData = {};

    if (targetType && targetId) {
      const tableMap = {
        settlement: 'settlements',
        payment: 'payments',
        exception: 'exceptions',
        incident: 'incidents',
        refund: 'refunds',
        dispute: 'disputes',
      };
      const table = tableMap[targetType];
      const idCol = `${targetType}_id`;
      if (table) {
        const { data } = await supabase.from(table).select('*').eq(idCol, targetId).single();
        entity = data;

        // Fetch related payments if it's a settlement
        if (targetType === 'settlement') {
          const { data: payments } = await supabase.from('payments').select('*').eq('settlement_id', targetId).limit(10);
          relatedData.payments = payments || [];
        }
        // Fetch related entity if it's an exception
        if (targetType === 'exception' && entity?.payment_id) {
          const { data: payment } = await supabase.from('payments').select('*').eq('payment_id', entity.payment_id).single();
          relatedData.payment = payment;
        }
      }
    }

    // Create investigation record
    const { data: invData } = await supabase.from('investigations').insert({
      merchant_id: merchantId || entity?.merchant_id || 'UNKNOWN',
      question: query || `Investigate ${targetType} ${targetId}`,
      target_entity_type: targetType,
      target_entity_id: targetId,
      status: 'planning'
    }).select('investigation_id').single();

    const invId = invData?.investigation_id || 'INV_ANON';

    // Build AI prompt
    const prompt = `
You are TRACE, an expert AI financial investigator.

Investigate this ${targetType} anomaly: ${targetId}
User Query: ${query || `Perform a full investigation of ${targetType} ${targetId}`}

Entity Data:
${JSON.stringify(entity || {}, null, 2)}

Related Data:
${JSON.stringify(relatedData, null, 2)}

Provide a JSON investigation report:
{
  "summary": "2-3 sentence plain English summary of what happened and why",
  "confidence": 85,
  "variance_amount": 5000,
  "root_cause": "The root cause in one clear sentence",
  "evidence": [
    {"type": "financial", "description": "Description of key evidence", "severity": "HIGH"}
  ],
  "recommended_action": "APPROVE_FIX",
  "alternative_hypotheses": ["Alternative explanation if any"]
}

Return ONLY valid JSON, no markdown or extra text.`;

    // Run AI (if key available)
    let report = {
      summary: `Investigation of ${targetType} ${targetId} completed. Entity data retrieved from database.`,
      confidence: 60,
      variance_amount: entity?.variance_amount || 0,
      root_cause: 'Requires AI analysis to determine root cause.',
      evidence: [{ type: 'system', description: 'Entity data successfully retrieved from database.', severity: 'LOW' }],
      recommended_action: 'ESCALATE',
      alternative_hypotheses: []
    };

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.1 }
        });
        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          report = { ...report, ...JSON.parse(jsonMatch[0]) };
        }
      } catch (aiErr) {
        console.warn('AI call failed, using deterministic fallback:', aiErr.message);
        report.summary = `Deterministic analysis of ${targetType} ${targetId}: ${entity ? 'Entity found in database with status: ' + (entity.status || 'UNKNOWN') : 'Entity not found'}. AI analysis unavailable.`;
      }
    } else {
      report.summary = `Deterministic analysis: ${targetType} ${targetId} — ${entity ? `Status: ${entity.status || 'UNKNOWN'}, Amount: ₹${((entity.amount || 0)/100).toFixed(2)}` : 'Entity not found in database'}. Configure AI key for full investigation.`;
    }

    // Update investigation with findings
    await supabase.from('investigations').update({
      status: 'completed',
      ai_summary: report.summary,
      ai_confidence: report.confidence,
      recommended_action: report.recommended_action
    }).eq('investigation_id', invId);

    res.json({ ...report, investigation_id: invId });
  } catch (error) {
    console.error('Investigation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
