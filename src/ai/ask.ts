import { ai } from './gemini.js';
import { Schema, Type } from '@google/genai';

export const AskIntentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: { 
      type: Type.STRING, 
      description: "The user's intent. Must be one of: INVESTIGATE_INCIDENT, INVESTIGATE_SETTLEMENT, INVESTIGATE_PAYMENT, INVESTIGATE_REFUND, INVESTIGATE_EXCEPTION, GENERAL_SEARCH, or UNKNOWN",
    },
    entityId: { 
      type: Type.STRING, 
      description: "The extracted ID if the user provided one (e.g., SETL_8291, INC_001). Null if none provided.",
      nullable: true
    },
    suggestedAction: {
      type: Type.STRING,
      description: "A short, actionable button label (e.g., 'View Incident', 'Investigate Settlement', 'Show Dashboard')"
    },
    suggestedUrl: {
      type: Type.STRING,
      description: "The frontend route to navigate to based on the intent (e.g., '/incidents/INC_001', '/settlements/SETL_8291', '/')"
    },
    aiResponse: {
      type: Type.STRING,
      description: "A friendly, short natural language response to the user's query."
    }
  },
  required: ['intent', 'suggestedAction', 'suggestedUrl', 'aiResponse']
};

export async function askTrace(query: string, merchantId: string) {
  const model = 'gemini-2.5-flash'; // Fast, cheap model for routing
  
  const prompt = `
    You are TRACE, the AI financial operations assistant.
    A user has entered the following command in the global search bar: "${query}"
    
    Parse their intent, extract any IDs, and determine where they should navigate next.
    Use standard IDs: SETL_XXXX, INC_XXX, PAY_XXXX, REF_XXXX.
    
    If they ask a general question, try to route them to the relevant monitoring or overview page.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: AskIntentSchema
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (err: any) {
    console.error("Ask TRACE error:", err);
    return {
      intent: 'ERROR',
      aiResponse: "I'm having trouble connecting to my reasoning engine right now.",
      suggestedAction: 'Dismiss',
      suggestedUrl: '/'
    };
  }
}
