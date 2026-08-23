import { Type, FunctionDeclaration } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { calculateSettlement } from '../../engine/financial/settlement.js';

// --- Tool Declarations for Gemini ---

export const getSettlementTool: FunctionDeclaration = {
  name: 'get_settlement',
  description: 'Retrieves metadata about a settlement including its expected and actual amounts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      settlementId: { type: Type.STRING, description: 'The ID of the settlement (e.g., SETL_8291)' }
    },
    required: ['settlementId']
  }
};

export const calculateSettlementTool: FunctionDeclaration = {
  name: 'calculate_settlement',
  description: 'Runs the deterministic financial engine to calculate the variance for a settlement.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      settlementId: { type: Type.STRING }
    },
    required: ['settlementId']
  }
};

export const getRefundsTool: FunctionDeclaration = {
  name: 'get_refunds',
  description: 'Returns refunds related to a settlement by searching its settlement items.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      settlementId: { type: Type.STRING }
    },
    required: ['settlementId']
  }
};

export const getAdjustmentsTool: FunctionDeclaration = {
  name: 'get_adjustments',
  description: 'Returns adjustments applied to a settlement.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      settlementId: { type: Type.STRING }
    },
    required: ['settlementId']
  }
};

export const getDisputesTool: FunctionDeclaration = {
  name: 'get_disputes',
  description: 'Returns disputes related to a settlement.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      settlementId: { type: Type.STRING }
    },
    required: ['settlementId']
  }
};

export const getFeesTool: FunctionDeclaration = {
  name: 'get_fees',
  description: 'Returns fees and taxes aggregated from settlement items.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      settlementId: { type: Type.STRING }
    },
    required: ['settlementId']
  }
};

export const getSettlementItemsTool: FunctionDeclaration = {
  name: 'get_settlement_items',
  description: 'Returns all raw settlement items linked to this settlement.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      settlementId: { type: Type.STRING }
    },
    required: ['settlementId']
  }
};

export const getPaymentsTool: FunctionDeclaration = {
  name: 'get_payments',
  description: 'Returns payments related to a settlement by searching its settlement items.',
  parameters: {
    type: Type.OBJECT,
    properties: { settlementId: { type: Type.STRING } },
    required: ['settlementId']
  }
};

export const getBankTransactionsTool: FunctionDeclaration = {
  name: 'get_bank_transactions',
  description: 'Returns raw bank transactions linked to a settlement via UTR.',
  parameters: {
    type: Type.OBJECT,
    properties: { settlementId: { type: Type.STRING } },
    required: ['settlementId']
  }
};

export const verifyEvidenceTool: FunctionDeclaration = {
  name: 'verify_evidence',
  description: 'Verifies if a specific entity (like a refund or dispute) is mathematically the cause of a variance.',
  parameters: {
    type: Type.OBJECT,
    properties: { 
      settlementId: { type: Type.STRING },
      entityId: { type: Type.STRING, description: 'ID of the evidence (e.g., RFND_123)' },
      varianceAmount: { type: Type.NUMBER, description: 'The unexplained variance amount in paise' }
    },
    required: ['settlementId', 'entityId', 'varianceAmount']
  }
};

// --- Operational Phase 4 Tools ---

export const getOpenAnomaliesTool: FunctionDeclaration = {
  name: 'get_open_anomalies',
  description: 'Returns all open anomalies (exceptions) for a merchant.',
  parameters: { type: Type.OBJECT, properties: { merchantId: { type: Type.STRING } }, required: ['merchantId'] }
};

export const getMerchantBaselineTool: FunctionDeclaration = {
  name: 'get_merchant_baseline',
  description: 'Returns 7, 30, and 90 day historical baselines for a merchant metric (e.g. payment_success_rate).',
  parameters: { type: Type.OBJECT, properties: { merchantId: { type: Type.STRING }, metricName: { type: Type.STRING } }, required: ['merchantId', 'metricName'] }
};

export const getMerchantHealthTool: FunctionDeclaration = {
  name: 'get_merchant_health',
  description: 'Returns the deterministic health score and KPIs for a merchant.',
  parameters: { type: Type.OBJECT, properties: { merchantId: { type: Type.STRING } }, required: ['merchantId'] }
};

export const getIncidentsTool: FunctionDeclaration = {
  name: 'get_incidents',
  description: 'Returns all open incidents for a merchant.',
  parameters: { type: Type.OBJECT, properties: { merchantId: { type: Type.STRING } }, required: ['merchantId'] }
};

export const getIncidentTimelineTool: FunctionDeclaration = {
  name: 'get_incident_timeline',
  description: 'Returns the chronological timeline of anomalies correlated to an incident.',
  parameters: { type: Type.OBJECT, properties: { incidentId: { type: Type.STRING } }, required: ['incidentId'] }
};

export const getUnresolvedExposureTool: FunctionDeclaration = {
  name: 'get_unresolved_exposure',
  description: 'Calculates the total financial exposure of all open incidents.',
  parameters: { type: Type.OBJECT, properties: { merchantId: { type: Type.STRING } }, required: ['merchantId'] }
};

export const getPaymentMetricsTool: FunctionDeclaration = {
  name: 'get_payment_metrics',
  description: 'Returns recent payment volume and success rate.',
  parameters: { type: Type.OBJECT, properties: { merchantId: { type: Type.STRING }, hours: { type: Type.NUMBER } }, required: ['merchantId'] }
};

export const getWebhookMetricsTool: FunctionDeclaration = {
  name: 'get_webhook_metrics',
  description: 'Returns recent webhook delivery reliability.',
  parameters: { type: Type.OBJECT, properties: { merchantId: { type: Type.STRING }, hours: { type: Type.NUMBER } }, required: ['merchantId'] }
};

// --- Implementation of Tool Functions ---

export async function executeTool(name: string, args: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { settlementId } = args;

  if (name === 'get_settlement') {
    const { data } = await supabase.from('settlements').select('*').eq('settlement_id', settlementId).single();
    return data;
  }
  
  if (name === 'calculate_settlement') {
    return await calculateSettlement(supabase, settlementId);
  }

  if (name === 'get_refunds') {
    const { data: items } = await supabase.from('settlement_items')
      .select('refund_id, gross_amount, fee, net_amount')
      .eq('settlement_id', settlementId)
      .not('refund_id', 'is', null);
    
    if (!items || items.length === 0) return [];
    
    // Fetch actual refund details
    const refundIds = items.map(i => i.refund_id);
    const { data: refunds } = await supabase.from('refunds')
      .select('*')
      .in('refund_id', refundIds);
      
    return refunds || [];
  }

  if (name === 'get_adjustments') {
    const { data } = await supabase.from('adjustments').select('*').eq('settlement_id', settlementId);
    return data || [];
  }

  if (name === 'get_disputes') {
    const { data: items } = await supabase.from('settlement_items')
      .select('dispute_id')
      .eq('settlement_id', settlementId)
      .not('dispute_id', 'is', null);
    
    if (!items || items.length === 0) return [];
    
    const disputeIds = items.map(i => i.dispute_id);
    const { data: disputes } = await supabase.from('disputes').select('*').in('dispute_id', disputeIds);
    return disputes || [];
  }

  if (name === 'get_fees') {
    const { data: items } = await supabase.from('settlement_items')
      .select('fee, tax, settlement_item_id')
      .eq('settlement_id', settlementId);
    
    return items || [];
  }

  if (name === 'get_settlement_items') {
    const { data } = await supabase.from('settlement_items').select('*').eq('settlement_id', settlementId);
    return data || [];
  }

  if (name === 'get_payments') {
    const { data: items } = await supabase.from('settlement_items')
      .select('payment_id')
      .eq('settlement_id', settlementId)
      .not('payment_id', 'is', null);
    if (!items || items.length === 0) return [];
    const paymentIds = items.map(i => i.payment_id);
    const { data: payments } = await supabase.from('payments').select('*').in('payment_id', paymentIds);
    return payments || [];
  }

  if (name === 'get_bank_transactions') {
    const { data: settlement } = await supabase.from('settlements').select('utr').eq('settlement_id', settlementId).single();
    if (!settlement || !settlement.utr) return [];
    const { data: bankTxns } = await supabase.from('bank_transactions').select('*').eq('utr', settlement.utr);
    return bankTxns || [];
  }

  if (name === 'verify_evidence') {
    const { entityId, varianceAmount } = args;
    let amount = 0;
    if (entityId.startsWith('RFND_')) {
      const { data } = await supabase.from('refunds').select('amount').eq('refund_id', entityId).single();
      if (data) amount = data.amount;
    } else if (entityId.startsWith('DISP_')) {
      const { data } = await supabase.from('disputes').select('amount').eq('dispute_id', entityId).single();
      if (data) amount = data.amount;
    } else if (entityId.startsWith('ADJ_')) {
      const { data } = await supabase.from('adjustments').select('amount').eq('adjustment_id', entityId).single();
      if (data) amount = Math.abs(data.amount);
    }
    return { verified: amount === varianceAmount, evidenceAmount: amount, targetVariance: varianceAmount, matches: amount === varianceAmount };
  }

  // --- Phase 4 Implementations ---
  if (name === 'get_open_anomalies') {
    const { data } = await supabase.from('exceptions').select('*').eq('merchant_id', args.merchantId).eq('status', 'open');
    return data || [];
  }

  if (name === 'get_merchant_baseline') {
    const { data } = await supabase.from('merchant_baselines').select('*').eq('merchant_id', args.merchantId).eq('metric_name', args.metricName);
    return data || [];
  }

  if (name === 'get_merchant_health') {
    const { data } = await supabase.from('merchant_health').select('*').eq('merchant_id', args.merchantId).single();
    return data || { health_score: 100, status: 'Healthy' };
  }

  if (name === 'get_incidents') {
    const { data } = await supabase.from('incidents').select('*').eq('merchant_id', args.merchantId).eq('status', 'OPEN');
    return data || [];
  }

  if (name === 'get_incident_timeline') {
    const { data: incident } = await supabase.from('incidents').select('detected_at').eq('incident_id', args.incidentId).single();
    const { data: anomalies } = await supabase.from('exceptions').select('detected_at, type, amount, entity_id').eq('incident_id', args.incidentId).order('detected_at', { ascending: true });
    return { incident_detected: incident?.detected_at, anomalies: anomalies || [] };
  }

  if (name === 'get_unresolved_exposure') {
    const { data } = await supabase.from('incidents').select('unexplained_amount').eq('merchant_id', args.merchantId).eq('status', 'OPEN');
    const total = (data || []).reduce((acc, row) => acc + Number(row.unexplained_amount), 0);
    return { total_exposure_paise: total };
  }

  if (name === 'get_payment_metrics') {
    const hours = args.hours || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data: payments } = await supabase.from('payments').select('status, amount').eq('merchant_id', args.merchantId).gte('created_at', since);
    if (!payments) return { total_volume: 0, success_rate: 0 };
    const success = payments.filter((p: any) => p.status === 'captured');
    return { 
      total_volume: payments.reduce((a, b: any) => a + Number(b.amount), 0),
      success_rate: (success.length / payments.length) * 100
    };
  }

  if (name === 'get_webhook_metrics') {
    const hours = args.hours || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data: hooks } = await supabase.from('webhook_events').select('status').eq('merchant_id', args.merchantId).gte('created_at', since);
    if (!hooks || hooks.length === 0) return { reliability: 100, total_events: 0 };
    const success = hooks.filter((h: any) => h.status === 'processed');
    return { reliability: (success.length / hooks.length) * 100, total_events: hooks.length };
  }

  throw new Error(`Tool ${name} not implemented`);
}

export const tools = [
  getSettlementTool,
  calculateSettlementTool,
  getRefundsTool,
  getAdjustmentsTool,
  getDisputesTool,
  getFeesTool,
  getSettlementItemsTool,
  getPaymentsTool,
  getBankTransactionsTool,
  verifyEvidenceTool,
  getOpenAnomaliesTool,
  getMerchantBaselineTool,
  getMerchantHealthTool,
  getIncidentsTool,
  getIncidentTimelineTool,
  getUnresolvedExposureTool,
  getPaymentMetricsTool,
  getWebhookMetricsTool
];
