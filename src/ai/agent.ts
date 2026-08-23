import { ai as defaultAi } from './gemini.js';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './prompts.js';
import { InvestigationReportSchema } from './schemas.js';
import { createClient } from '@supabase/supabase-js';
import { calculateFinancialPosition } from '../engine/financial/calculator.js';

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

async function callGemini(systemPrompt: string, prompt: string, apiKey?: string) {
  const model = 'gemini-3.6-flash';
  const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : defaultAi;

  try {
    const response = await aiClient.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: InvestigationReportSchema,
        temperature: 0.1
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e: any) {
    if (e.status === 429) {
      throw new RateLimitError('Google Gemini API Rate Limit Exceeded.');
    }
    throw e;
  }
}

// In a real app we would use an interface, but for now we'll just check env var
async function callAIProvider(systemPrompt: string, prompt: string, apiKey?: string) {
  const provider = process.env.AI_PROVIDER || 'gemini';
  
  if (provider === 'mock' && !apiKey) {
    return {
      summary: "Mock Provider: This is a test response.",
      confidence: 100,
      evidence: [],
      alternativeHypotheses: [],
      recommendedAction: "APPROVE_FIX"
    };
  }

  // Fallback to Gemini
  return callGemini(systemPrompt, prompt, apiKey);
}

export async function runInvestigation({ query, merchantId, targetId, targetType = 'settlement', apiKey }: { query: string, merchantId: string, targetId?: string, targetType?: string, apiKey?: string }) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Create DB Record
  const { data: invData } = await supabase.from('investigations').insert({
    merchant_id: merchantId,
    question: query,
    target_entity_type: targetType,
    target_entity_id: targetId,
    status: 'planning'
  }).select('investigation_id').single();

  const invId = invData?.investigation_id || 'LOCAL_RUN';

  try {
    // 2. Fetch Deterministic Facts
    const context = await calculateFinancialPosition(targetType, targetId || '');

    // 3. Prepare AI Prompt
    const prompt = `
Investigate this anomaly for ${targetType} ${targetId}.
User Query: ${query}

Strict Deterministic Facts:
Expected Amount: ₹${context.deterministic_facts.expected_amount.toFixed(2)}
Actual Amount: ₹${context.deterministic_facts.actual_amount.toFixed(2)}
Variance: ₹${context.deterministic_facts.variance.toFixed(2)}
Explained Amount: ₹${context.deterministic_facts.explained_amount.toFixed(2)}
Unexplained Amount: ₹${context.deterministic_facts.unexplained_amount.toFixed(2)}

Evidence Found by Deterministic Engine:
${JSON.stringify(context.evidence_found, null, 2)}

Related Records:
${JSON.stringify(context.related_records, null, 2)}

CRITICAL RULES:
1. Do not invent or change numbers.
2. ALWAYS format money accurately in Indian Rupees (INR) using the ₹ symbol (e.g. ₹5.00). Do NOT use paise.
3. Explain what happened based ONLY on the evidence provided.
    `;

    // 3. Trigger AI synthesis
    const aiResult = await callAIProvider(SYSTEM_PROMPT, prompt, apiKey);

    // 5. Build Final Result
    const finalResult = {
      investigationId: invId,
      targetId: targetId,
      status: "COMPLETED",
      summary: aiResult.summary || aiResult.investigation_summary || "Investigation complete.",
      evidence: aiResult.evidence || context.evidence_found || [],
      explainedAmount: context.deterministic_facts.explained_amount,
      unexplainedAmount: context.deterministic_facts.unexplained_amount,
      confidence: aiResult.confidence || 90,
      recommendedAction: aiResult.recommendedAction || aiResult.recommended_action || "ESCALATE",
      deterministic_context: context.deterministic_facts // Pass back so UI can display it
    };

    // 6. Save to DB
    await supabase.from('investigations').update({
      status: finalResult.status,
      root_cause: finalResult.summary,
      explained_amount: finalResult.explainedAmount,
      unexplained_amount: finalResult.unexplainedAmount,
      confidence: finalResult.confidence,
      recommended_action: finalResult.recommendedAction
    }).eq('investigation_id', invId);

    return finalResult;

  } catch (err: any) {
    if (err.name === 'RateLimitError' || err.message?.includes('Rate Limit')) {
      console.warn('[Agent] Rate limit hit. Throwing AI_UNAVAILABLE for graceful fallback.');
      
      // Update DB to show it failed gracefully
      await supabase.from('investigations').update({
        status: 'AI_UNAVAILABLE',
        root_cause: 'AI provider is temporarily unavailable due to rate limits.'
      }).eq('investigation_id', invId);

      // Re-throw so the HTTP endpoint returns 429
      throw err;
    }

    // Update DB on hard error
    await supabase.from('investigations').update({
      status: 'FAILED',
      root_cause: err.message
    }).eq('investigation_id', invId);
    
    throw err;
  }
}
