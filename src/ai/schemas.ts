import { Type } from '@google/genai';

export const InvestigationReportSchema = {
  type: Type.OBJECT,
  properties: {
    investigationId: { type: Type.STRING },
    settlementId: { type: Type.STRING },
    status: { type: Type.STRING, enum: ['resolved', 'partially_resolved', 'human_review'] },
    summary: { type: Type.STRING, description: 'Concise summary of the findings' },
    variance: { type: Type.NUMBER, description: 'The absolute total variance in paise' },
    explainedAmount: { type: Type.NUMBER, description: 'The amount in paise that was successfully explained' },
    unexplainedAmount: { type: Type.NUMBER, description: 'The amount in paise that remains unexplained' },
    rootCauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['REFUND', 'DISPUTE', 'ADJUSTMENT', 'FEE', 'TAX', 'BANK_MISMATCH', 'SETTLEMENT_ITEM', 'UNKNOWN'] },
          amount: { type: Type.NUMBER },
          explanation: { type: Type.STRING }
        }
      }
    },
    confidence: { type: Type.NUMBER, description: 'Deterministic confidence score (0-100)' },
    recommendedAction: { type: Type.STRING }
  },
  required: ['investigationId', 'settlementId', 'status', 'summary', 'variance', 'explainedAmount', 'unexplainedAmount', 'rootCauses', 'confidence', 'recommendedAction']
};
