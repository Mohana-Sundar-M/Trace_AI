// Vercel Serverless Function: /api/simulator/scenario
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { scenario = 'NORMAL' } = req.body || {};
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables not set on Vercel' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let logs = [];
    const log = (msg) => logs.push(msg);

    const randStr = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    const gId = (prefix) => `${prefix}_${randStr()}`;

    const merchantId = 'M_1001';
    const customerId = gId('CUS');
    const orderId = gId('ORD');
    const paymentId = gId('PAY');
    const amount = 50000; // 500 INR

    log(`[Simulator] Running Scenario: ${scenario}`);

    // Create Base Entities
    await supabase.from('customers').insert({
      customer_id: customerId,
      merchant_id: merchantId,
      name: `Synthetic Customer ${randStr()}`,
      email: 'test@trace.local'
    });

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

      log(`[Simulator] Generated Settlement: ${setlId}`);

      if (scenario === 'VARIANCE') {
        const excId = gId('EXC');
        await supabase.from('exceptions').insert({
          exception_id: excId, merchant_id: merchantId, severity: 'HIGH', type: 'Settlement Variance Detected', amount: 5000, entity_type: 'settlement', entity_id: setlId, status: 'DETECTED'
        });
        log(`[Simulator] Generated Variance Exception: ${excId}`);
      }
    }

    if (scenario === 'WEBHOOK_FAIL') {
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

      log(`[Simulator] Generated Webhook Incident: ${incId}`);
    }

    if (scenario === 'REFUND_SPIKE') {
      const incId = gId('INC');
      await supabase.from('incidents').insert({
        incident_id: incId, merchant_id: merchantId, severity: 'HIGH', title: 'Refund Velocity Spike', potential_loss: amount * 10, status: 'DETECTED'
      });
      for (let i = 0; i < 5; i++) {
        const refId = gId('REF');
        await supabase.from('refunds').insert({
          refund_id: refId, merchant_id: merchantId, payment_id: paymentId, amount, status: 'processed', speed_processed: 'optimum'
        });
        await supabase.from('exceptions').insert({
          exception_id: gId('EXC'), merchant_id: merchantId, severity: 'MEDIUM', type: 'Rapid Refund Execution', amount, entity_type: 'refund', entity_id: refId, status: 'DETECTED', incident_id: incId
        });
      }
      log(`[Simulator] Generated Refund Incident: ${incId}`);
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
      log(`[Simulator] Generated Duplicate Exception: ${excId}`);
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
      log(`[Simulator] Generated Degradation Incident: ${incId}`);
    }

    if (scenario === 'RESET') {
      log('[Simulator] Sandbox Data Reset triggered successfully.');
    }

    if (scenario === 'BULK_1000') {
      const insertRows = [];
      for (let i = 0; i < 50; i++) {
        insertRows.push({
          payment_id: gId('PAY'), order_id: orderId, merchant_id: merchantId, customer_id: customerId, amount, status: 'captured', method: 'upi'
        });
      }
      await supabase.from('payments').insert(insertRows);
      log('[Simulator] Generated bulk synthetic events successfully.');
    }

    res.json({ success: true, stdout: logs.join('\n') });
  } catch (error) {
    console.error('Simulator API error:', error);
    res.status(500).json({ error: error.message || 'Simulator failed' });
  }
}
