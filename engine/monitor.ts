import { createClient } from '@supabase/supabase-js';
import { evaluateAllAnomalies } from './anomaly/detectors.js';
import { correlateAnomalies } from './correlation/index.js';
import { calculateMerchantBaselines } from './anomaly/baseline.js';

export function startMonitor() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Monitor] Missing Supabase credentials. Realtime monitor offline.');
    return;
  }

  // NOTE: In a Node environment, globalThis.WebSocket must be polyfilled for @supabase/realtime-js
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('[Monitor] Starting Realtime anomaly detection engine...');

  const channel = supabase.channel('financial_events')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, async (payload) => {
      console.log('[Monitor] New payment detected. Evaluating anomalies...');
      await evaluateAllAnomalies(supabase, payload.new.merchant_id);
      await correlateAnomalies(supabase, payload.new.merchant_id);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'refunds' }, async (payload) => {
      console.log('[Monitor] New refund detected. Evaluating anomalies...');
      await evaluateAllAnomalies(supabase, payload.new.merchant_id);
      await correlateAnomalies(supabase, payload.new.merchant_id);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'webhook_events' }, async (payload) => {
      console.log('[Monitor] New webhook event. Evaluating anomalies...');
      await evaluateAllAnomalies(supabase, payload.new.merchant_id);
      await correlateAnomalies(supabase, payload.new.merchant_id);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'settlements' }, async (payload) => {
      console.log('[Monitor] New settlement created. Evaluating variance...');
      await evaluateAllAnomalies(supabase, payload.new.merchant_id, payload.new.settlement_id, payload.new.utr);
      await correlateAnomalies(supabase, payload.new.merchant_id);
    })
    .subscribe((status) => {
      console.log(`[Monitor] Realtime channel status: ${status}`);
    });

  // Run baseline calculations every hour (or just once at startup for testing)
  // Hardcoding merchant for testing purposes
  setTimeout(() => {
    calculateMerchantBaselines(supabase, 'TEST_MERCHANT').then(res => {
      console.log('[Monitor] Merchant baselines calculated. Health:', res.status, res.healthScore);
    }).catch(console.error);
  }, 2000);

  return channel;
}
