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
    const { query, targetType = 'settlement', targetId = '', merchantId = 'M_1001' } = req.body || {};
    const apiKey = req.headers['x-ai-key'] || req.headers['X-AI-Key'] || process.env.GEMINI_API_KEY;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables not configured on Vercel.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Calculate Financial Position & Context Deterministically
    let expectedAmount = 0;
    let actualAmount = 0;
    let variance = 0;
    let explainedAmount = 0;
    let unexplainedAmount = 0;
    let evidence = [];
    let entityData = null;

    const normType = (targetType || '').toLowerCase();

    if (normType === 'settlement' && targetId) {
      const { data: setl } = await supabase.from('settlements').select('*').eq('settlement_id', targetId).maybeSingle();
      if (setl) {
        entityData = setl;
        actualAmount = setl.amount || 0;

        const { data: items } = await supabase.from('settlement_items').select('*, payments(*)').eq('settlement_id', targetId);
        if (items && items.length > 0) {
          items.forEach(i => {
            if (i.payments) expectedAmount += (i.payments.amount || 0);
          });
        } else {
          // Fallback: estimate expected amount from payments having this settlement_id
          const { data: payList } = await supabase.from('payments').select('amount').eq('settlement_id', targetId);
          (payList || []).forEach(p => { expectedAmount += (p.amount || 0); });
        }

        variance = Math.abs(expectedAmount - actualAmount);

        // Check for exceptions or disputes
        const { data: excs } = await supabase.from('exceptions').select('*').eq('entity_id', targetId);
        (excs || []).forEach(e => {
          explainedAmount += (e.amount || 0);
          evidence.push({
            type: 'EXCEPTION',
            relationship: `${e.type}: ${e.status}`,
            amount: e.amount || 0,
            severity: e.severity || 'HIGH'
          });
        });

        unexplainedAmount = Math.max(0, variance - explainedAmount);
      }
    } else if (normType === 'refund' && targetId) {
      const { data: ref } = await supabase.from('refunds').select('*').eq('refund_id', targetId).maybeSingle();
      if (ref) {
        entityData = ref;
        actualAmount = ref.amount || 0;
        expectedAmount = ref.amount || 0;
        variance = 0;
        explainedAmount = ref.amount || 0;
        unexplainedAmount = 0;

        if (ref.payment_id) {
          const { data: pay } = await supabase.from('payments').select('*').eq('payment_id', ref.payment_id).maybeSingle();
          if (pay) {
            evidence.push({
              type: 'ORIGINAL_PAYMENT',
              relationship: `Original Payment ${pay.payment_id} Status: ${pay.status}`,
              amount: pay.amount || 0,
              severity: 'LOW'
            });
          }
        }
      }
    } else if (normType === 'payment' && targetId) {
      const { data: pay } = await supabase.from('payments').select('*').eq('payment_id', targetId).maybeSingle();
      if (pay) {
        entityData = pay;
        actualAmount = pay.amount || 0;
        expectedAmount = pay.amount || 0;
        variance = 0;
        explainedAmount = pay.amount || 0;

        const { data: disputes } = await supabase.from('disputes').select('*').eq('payment_id', targetId);
        (disputes || []).forEach(d => {
          evidence.push({
            type: 'DISPUTE',
            relationship: `Dispute ${d.dispute_id} (${d.status})`,
            amount: d.amount || 0,
            severity: 'HIGH'
          });
        });
      }
    } else if (normType === 'exception' && targetId) {
      const { data: exc } = await supabase.from('exceptions').select('*').eq('exception_id', targetId).maybeSingle();
      if (exc) {
        entityData = exc;
        variance = exc.amount || 0;
        unexplainedAmount = exc.amount || 0;
        evidence.push({
          type: 'EXCEPTION_DETAIL',
          relationship: `Exception ${exc.type} on ${exc.entity_type} ${exc.entity_id}`,
          amount: exc.amount || 0,
          severity: exc.severity || 'HIGH'
        });
      }
    }

    const deterministic_context = {
      expected_amount: expectedAmount,
      actual_amount: actualAmount,
      variance: variance,
      explained_amount: explainedAmount,
      unexplained_amount: unexplainedAmount
    };

    // 2. Build Default AI / Deterministic Report
    let report = {
      investigationId: `INV_${Date.now().toString(36).toUpperCase()}`,
      targetId: targetId,
      status: 'COMPLETED',
      summary: entityData 
        ? `Deterministic Analysis of ${normType} ${targetId}: Status is '${entityData.status || 'PROCESSED'}'. System recorded expected amount of ₹${(expectedAmount/100).toFixed(2)} vs actual amount of ₹${(actualAmount/100).toFixed(2)}.`
        : `Investigation for ${normType} ${targetId} initialized.`,
      confidence: 90,
      explainedAmount: explainedAmount,
      unexplainedAmount: unexplainedAmount,
      variance_amount: variance,
      evidence: evidence.length > 0 ? evidence : [{ type: 'SYSTEM', relationship: `Entity ${targetId} validated in database ledger.`, severity: 'LOW' }],
      recommendedAction: variance > 0 ? 'APPROVE_FIX' : 'NO_ACTION_REQUIRED',
      deterministic_context: deterministic_context
    };

    // 3. Attempt Gemini Synthesis if Key Present
    if (apiKey) {
      const prompt = `
Investigate this ${normType} anomaly for ${targetId}.
User Query: ${query || `Analyze ${normType} ${targetId}`}

Deterministic Ledger Facts:
- Expected Amount: ₹${(expectedAmount/100).toFixed(2)}
- Actual Amount: ₹${(actualAmount/100).toFixed(2)}
- Variance: ₹${(variance/100).toFixed(2)}
- Explained Amount: ₹${(explainedAmount/100).toFixed(2)}
- Unexplained Amount: ₹${(unexplainedAmount/100).toFixed(2)}

Evidence Found:
${JSON.stringify(evidence, null, 2)}

Entity Record:
${JSON.stringify(entityData || {}, null, 2)}

Return a JSON object matching:
{
  "summary": "Clear plain-English root cause analysis",
  "confidence": 92,
  "recommendedAction": "APPROVE_RECOMMENDATION" or "REJECT_RECOMMENDATION" or "ESCALATE",
  "alternativeHypotheses": ["Alternative possibility if any"]
}`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
      const ai = new GoogleGenAI({ apiKey });

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.1 }
          });
          const text = response.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            report.summary = parsed.summary || report.summary;
            report.confidence = parsed.confidence || report.confidence;
            report.recommendedAction = parsed.recommendedAction || report.recommendedAction;
            break;
          }
        } catch (aiErr) {
          console.warn(`Model ${modelName} failed:`, aiErr.message);
        }
      }
    }

    // Save to investigations table asynchronously
    supabase.from('investigations').insert({
      merchant_id: merchantId,
      question: query || `Investigate ${normType} ${targetId}`,
      target_entity_type: normType,
      target_entity_id: targetId,
      status: 'completed',
      ai_summary: report.summary,
      ai_confidence: report.confidence,
      recommended_action: report.recommendedAction,
      explained_amount: explainedAmount,
      unexplained_amount: unexplainedAmount
    }).then(() => {}).catch(err => console.warn('DB Log warning:', err.message));

    res.json(report);
  } catch (error) {
    console.error('Investigation handler error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
