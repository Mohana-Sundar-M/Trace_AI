// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

import WebSocket from 'ws';
// @ts-ignore
globalThis.WebSocket = WebSocket;

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { WebSocket: WebSocket }
});

export async function calculateFinancialPosition(entityType: string, entityId: string) {
  let expectedAmount = 0;
  let actualAmount = 0;
  let variance = 0;
  let explainedAmount = 0;
  let unexplainedAmount = 0;
  let evidence: any[] = [];
  let relatedRecords: any = {};

  if (entityType === 'exception') {
    const { data: exc } = await supabase.from('exceptions').select('*').eq('exception_id', entityId).single();
    if (exc) {
      relatedRecords.exception = exc;
      entityType = exc.entity_type;
      entityId = exc.entity_id;
    }
  } else if (entityType === 'incident') {
    const { data: inc } = await supabase.from('incidents').select('*').eq('incident_id', entityId).single();
    if (inc) {
      relatedRecords.incident = inc;
      // Fetch the first exception
      const { data: excs } = await supabase.from('exceptions').select('*').eq('incident_id', entityId).limit(1);
      if (excs && excs.length > 0) {
        relatedRecords.exception = excs[0];
        entityType = excs[0].entity_type;
        entityId = excs[0].entity_id;
      }
    }
  }

  if (entityType === 'settlement') {
    // 1. Fetch actual settlement
    const { data: setl } = await supabase.from('settlements').select('*').eq('settlement_id', entityId).single();
    if (!setl) throw new Error(`Settlement ${entityId} not found`);
    
    actualAmount = setl.amount;
    relatedRecords.settlement = setl;

    // 2. Fetch expected payments for this settlement via settlement_items
    const { data: items } = await supabase.from('settlement_items').select('*, payments(*)').eq('settlement_id', entityId);
    
    let payments: any[] = [];
    if (items && items.length > 0) {
      payments = items.map(i => i.payments).filter(p => p !== null);
    }
    
    const expectedFromPayments = payments.reduce((acc, p) => acc + p.amount, 0);
    
    // In our simplified mock schema, if there are no linked payments yet, we assume expected = actual for normal cases
    if (payments && payments.length > 0) {
      expectedAmount = expectedFromPayments;
      relatedRecords.payments = payments;
    } else {
      // Fallback for isolated mock data
      expectedAmount = actualAmount; 
    }

    variance = expectedAmount - actualAmount;

    // 3. Find explaining records (Refunds, Adjustments, Disputes)
    if (variance !== 0) {
      // Find refunds related to these payments
      if (payments && payments.length > 0) {
        const paymentIds = payments.map(p => p.payment_id);
        const { data: refunds } = await supabase.from('refunds').select('*').in('payment_id', paymentIds);
        
        if (refunds && refunds.length > 0) {
          relatedRecords.refunds = refunds;
          const totalRefunds = refunds.reduce((acc, r) => acc + r.amount, 0);
          explainedAmount += totalRefunds;
          
          refunds.forEach(r => {
            evidence.push({
              type: 'refund',
              id: r.refund_id,
              amount: r.amount,
              relationship: 'reduces expected settlement'
            });
          });
        }
      }
    }

    unexplainedAmount = variance - explainedAmount;
  } 
  
  else if (entityType === 'payment') {
    const { data: pay } = await supabase.from('payments').select('*').eq('payment_id', entityId).single();
    if (pay) {
      expectedAmount = pay.amount;
      actualAmount = pay.status === 'captured' ? pay.amount : 0;
      variance = expectedAmount - actualAmount;
      unexplainedAmount = variance;
      relatedRecords.payment = pay;

      // Check webhooks
      const { data: webhooks } = await supabase.from('webhook_events').select('*').eq('entity_id', entityId);
      if (webhooks && webhooks.length > 0) {
        relatedRecords.webhooks = webhooks;
        const failedWebhooks = webhooks.filter(w => w.status === 'failed');
        if (failedWebhooks.length > 0) {
          evidence.push({
            type: 'webhook_failure',
            id: failedWebhooks[0].event_id,
            detail: `${failedWebhooks.length} failed webhook attempts`
          });
        }
      }

      // Check refunds
      const { data: refunds } = await supabase.from('refunds').select('*').eq('payment_id', entityId);
      if (refunds && refunds.length > 0) {
        relatedRecords.refunds = refunds;
        evidence.push({
          type: 'refund_detected',
          id: refunds[0].refund_id,
          detail: `${refunds.length} refunds processed`,
          amount: refunds.reduce((acc, r) => acc + r.amount, 0)
        });
      }
    }
  }

  // Build the strict AI Context
  return {
    deterministic_facts: {
      entity_type: entityType,
      entity_id: entityId,
      expected_amount: expectedAmount / 100,
      actual_amount: actualAmount / 100,
      variance: variance / 100,
      explained_amount: explainedAmount / 100,
      unexplained_amount: unexplainedAmount / 100
    },
    evidence_found: evidence,
    related_records: relatedRecords
  };
}
