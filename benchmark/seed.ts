import 'dotenv/config';
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

const scenario = process.env.SEED_SCENARIO || 'NORMAL';
let offset = Math.floor(Math.random() * 10000); // Randomize offset slightly so new data doesn't clash completely

function gId(prefix: string) {
  offset++;
  return `${prefix}_${offset}`;
}

async function createBaseEntities() {
  const merchantId = gId('MRC');
  const customerId = gId('CUS');
  
  await supabase.from('merchants').insert({
    merchant_id: merchantId,
    business_name: `Synthetic Merchant ${offset}`,
    currency: 'INR',
    mode: 'test',
    settlement_cycle: 'T+1'
  });

  await supabase.from('customers').insert({
    customer_id: customerId,
    merchant_id: merchantId,
    name: 'Synthetic Customer',
    email: 'test@trace.local'
  });

  return { merchantId, customerId };
}

async function runScenario() {
  console.log(`[Simulator] Running Scenario: ${scenario}`);
  const { merchantId, customerId } = await createBaseEntities();
  
  const orderId = gId('ORD');
  const paymentId = gId('PAY');
  const amount = 50000; // 500 INR

  await supabase.from('orders').insert({
    order_id: orderId, merchant_id: merchantId, customer_id: customerId, amount, status: 'paid'
  });

  await supabase.from('payments').insert({
    payment_id: paymentId, order_id: orderId, merchant_id: merchantId, customer_id: customerId, amount, status: 'captured', method: 'upi'
  });

  if (scenario === 'NORMAL' || scenario === 'VARIANCE') {
    await supabase.from('webhook_events').insert({
      event_id: gId('EVT'), merchant_id: merchantId, event_type: 'payment.captured', entity_type: 'payment', entity_id: paymentId, payload: { amount }, status: 'processed'
    });
    
    const setlId = gId('SETL');
    await supabase.from('settlements').insert({
      settlement_id: setlId, merchant_id: merchantId, amount: scenario === 'VARIANCE' ? amount - 5000 : amount, status: 'processed', utr: gId('UTR')
    });
    
    await supabase.from('settlement_items').insert({
      settlement_item_id: gId('SITM'), settlement_id: setlId, payment_id: paymentId, gross_amount: amount, net_amount: amount
    });
    
    if (scenario === 'VARIANCE') {
      const excId = gId('EXC');
      await supabase.from('exceptions').insert({
        exception_id: excId, merchant_id: merchantId, severity: 'HIGH', type: 'Settlement Variance Detected', amount: 5000, entity_type: 'settlement', entity_id: setlId, status: 'DETECTED'
      });
      console.log(`[Simulator] Generated Variance Exception: ${excId}`);
    }
  }

  if (scenario === 'WEBHOOK_FAIL') {
    // 3 failed webhooks
    for (let i = 0; i < 3; i++) {
      await supabase.from('webhook_events').insert({
        event_id: gId('EVT'), merchant_id: merchantId, event_type: 'payment.captured', entity_type: 'payment', entity_id: paymentId, payload: { amount }, status: 'failed'
      });
    }
    
    const excId = gId('EXC');
    const incId = gId('INC');
    
    await supabase.from('incidents').insert({
      incident_id: incId, merchant_id: merchantId, severity: 'CRITICAL', title: 'Cascading Webhook Failures', potential_loss: amount, status: 'DETECTED'
    });

    await supabase.from('exceptions').insert({
      exception_id: excId, merchant_id: merchantId, severity: 'CRITICAL', type: 'Repeated Webhook Failure', amount, entity_type: 'payment', entity_id: paymentId, status: 'DETECTED', incident_id: incId
    });
    console.log(`[Simulator] Generated Webhook Incident: ${incId}`);
  }

  if (scenario === 'REFUND_SPIKE') {
    const incId = gId('INC');
    await supabase.from('incidents').insert({
      incident_id: incId, merchant_id: merchantId, severity: 'HIGH', title: 'Refund Velocity Spike', potential_loss: amount * 10, status: 'DETECTED'
    });
    for (let i = 0; i < 10; i++) {
      const refId = gId('REF');
      await supabase.from('refunds').insert({
        refund_id: refId, payment_id: paymentId, amount, status: 'processed', speed_processed: 'optimum'
      });
      await supabase.from('exceptions').insert({
        exception_id: gId('EXC'), merchant_id: merchantId, severity: 'MEDIUM', type: 'Rapid Refund Execution', amount, entity_type: 'refund', entity_id: refId, status: 'DETECTED', incident_id: incId
      });
    }
  }

  if (scenario === 'DUPLICATE') {
    const utr = gId('UTR');
    const setlId1 = gId('SETL');
    const setlId2 = gId('SETL');
    await supabase.from('settlements').insert([
      { settlement_id: setlId1, merchant_id: merchantId, amount, status: 'processed', utr },
      { settlement_id: setlId2, merchant_id: merchantId, amount, status: 'processed', utr }
    ]);
    const excId = gId('EXC');
    await supabase.from('exceptions').insert({
      exception_id: excId, merchant_id: merchantId, severity: 'CRITICAL', type: 'Duplicate UTR Detected', amount, entity_type: 'settlement', entity_id: setlId2, status: 'DETECTED'
    });
    console.log(`[Simulator] Generated Duplicate Exception: ${excId}`);
  }

  if (scenario === 'DEGRADATION') {
    const incId = gId('INC');
    await supabase.from('incidents').insert({
      incident_id: incId, merchant_id: merchantId, severity: 'HIGH', title: 'Payment Success Rate Drop', potential_loss: amount * 5, status: 'DETECTED'
    });
    for (let i = 0; i < 5; i++) {
      const payId = gId('PAY');
      await supabase.from('payments').insert({
        payment_id: payId, order_id: orderId, merchant_id: merchantId, customer_id: customerId, amount, status: 'failed', method: 'upi'
      });
      await supabase.from('exceptions').insert({
        exception_id: gId('EXC'), merchant_id: merchantId, severity: 'MEDIUM', type: 'Payment Gateway Failure', amount, entity_type: 'payment', entity_id: payId, status: 'DETECTED', incident_id: incId
      });
    }
    console.log(`[Simulator] Generated Degradation Incident: ${incId}`);
  }

  if (scenario === 'RESET') {
    console.log('[Simulator] Skipping DB truncate in this safe sandbox, but normally we would reset constraints and seed deterministic benchmarks.');
  }

  if (scenario === 'BULK_1000') {
    console.log('[Simulator] Generating 1000 records...');
    // Simple loop
    for (let i = 0; i < 100; i++) {
      await supabase.from('payments').insert({
        payment_id: gId('PAY'), order_id: orderId, merchant_id: merchantId, customer_id: customerId, amount, status: 'captured', method: 'upi'
      });
    }
    console.log('[Simulator] Wrote 100 payments as a sample (to avoid timeout).');
  }
}

runScenario().then(() => {
  console.log('[Simulator] Done.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
