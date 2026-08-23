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

const merchantId = 'M_1001';
const customerId = 'CUS_999';

const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

async function run() {
  console.log("Generating large volume of mock data...");

  // Generate 5 Settlements
  for (let s = 0; s < 5; s++) {
    const setlId = generateId('SETL');
    let totalSettlementAmount = 0;
    
    // For each settlement, generate 20 Payments
    const items = [];
    const paymentsToInsert = [];
    const ordersToInsert = [];
    const webhooksToInsert = [];
    const refundsToInsert = [];
    
    for (let p = 0; p < 20; p++) {
      const amount = Math.floor(Math.random() * 50000) + 1000;
      totalSettlementAmount += amount;
      
      const orderId = generateId('ORD');
      const paymentId = generateId('PAY');
      
      ordersToInsert.push({ order_id: orderId, merchant_id: merchantId, customer_id: customerId, amount, status: 'paid' });
      paymentsToInsert.push({ payment_id: paymentId, order_id: orderId, merchant_id: merchantId, customer_id: customerId, amount, status: 'captured', method: 'upi' });
      
      items.push({ settlement_item_id: generateId('SITM'), settlement_id: setlId, payment_id: paymentId, gross_amount: amount, net_amount: amount });
      
      webhooksToInsert.push({ event_id: generateId('EVT'), merchant_id: merchantId, event_type: 'payment.captured', entity_type: 'payment', entity_id: paymentId, payload: { amount }, status: 'processed' });

      // Add a refund randomly
      if (Math.random() > 0.8) {
        const refId = generateId('REF');
        refundsToInsert.push({ refund_id: refId, payment_id: paymentId, amount, status: 'processed', speed_processed: 'optimum' });
      }
    }
    
    await supabase.from('orders').insert(ordersToInsert);
    await supabase.from('payments').insert(paymentsToInsert);
    
    // Add some variance or exceptions randomly
    const isVariance = Math.random() > 0.6;
    const finalSetlAmount = isVariance ? totalSettlementAmount - 10000 : totalSettlementAmount;
    
    await supabase.from('settlements').insert({
      settlement_id: setlId, merchant_id: merchantId, amount: finalSetlAmount, status: 'processed', utr: generateId('UTR')
    });
    
    await supabase.from('settlement_items').insert(items);
    await supabase.from('webhook_events').insert(webhooksToInsert);
    if (refundsToInsert.length > 0) await supabase.from('refunds').insert(refundsToInsert);
    
    if (isVariance) {
      const excId = generateId('EXC');
      const incId = generateId('INC');
      
      await supabase.from('incidents').insert({
        incident_id: incId, merchant_id: merchantId, severity: 'HIGH', title: 'Settlement Amount Mismatch', potential_loss: 10000, status: 'DETECTED'
      });
      
      await supabase.from('exceptions').insert({
        exception_id: excId, merchant_id: merchantId, severity: 'HIGH', type: 'Settlement Variance Detected', amount: 10000, entity_type: 'settlement', entity_id: setlId, status: 'DETECTED', incident_id: incId
      });
    }
  }

  // Create a webhook failure incident
  const incId = generateId('INC');
  await supabase.from('incidents').insert({
    incident_id: incId, merchant_id: merchantId, severity: 'CRITICAL', title: 'Cascading Webhook Failures', potential_loss: 50000, status: 'DETECTED'
  });
  
  for (let w = 0; w < 5; w++) {
    const pId = generateId('PAY');
    await supabase.from('orders').insert({ order_id: generateId('ORD'), merchant_id: merchantId, customer_id: customerId, amount: 10000, status: 'paid' });
    await supabase.from('payments').insert({ payment_id: pId, order_id: generateId('ORD'), merchant_id: merchantId, customer_id: customerId, amount: 10000, status: 'captured', method: 'card' });
    
    await supabase.from('webhook_events').insert({
      event_id: generateId('EVT'), merchant_id: merchantId, event_type: 'payment.captured', entity_type: 'payment', entity_id: pId, payload: { amount: 10000 }, status: 'failed'
    });
    
    await supabase.from('exceptions').insert({
      exception_id: generateId('EXC'), merchant_id: merchantId, severity: 'HIGH', type: 'Webhook Delivery Failed', amount: 10000, entity_type: 'payment', entity_id: pId, status: 'DETECTED', incident_id: incId
    });
  }

  console.log("Finished generating bulk data!");
}

run();
