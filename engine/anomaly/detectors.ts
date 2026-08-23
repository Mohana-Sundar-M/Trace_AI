import { SupabaseClient } from '@supabase/supabase-js';

// Anomaly Scoring weights (Deterministic)
// Max Score = 100
// score = severity (up to 40) + financial_impact (up to 30) + deviation (up to 20) + confidence (up to 10)

function calculateScore(severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW', impactInPaise: number, deviationPct: number, confidence: number): number {
  let score = 0;
  if (severity === 'CRITICAL') score += 40;
  else if (severity === 'HIGH') score += 30;
  else if (severity === 'MEDIUM') score += 20;
  else score += 10;

  // Impact: 1 lakh paise = 1000 rupees. 
  // Let's say max 30 points if impact > 1,00,000 rupees (1,00,00,000 paise)
  let impactScore = Math.min(30, (impactInPaise / 10000000) * 30);
  score += impactScore;

  // Deviation: up to 20 points for 100% deviation
  let devScore = Math.min(20, (deviationPct / 100) * 20);
  score += devScore;

  // Confidence: up to 10 points
  score += (confidence / 100) * 10;

  return Math.min(100, Math.round(score));
}

function getSeverityClassification(score: number) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  if (score >= 25) return 'LOW';
  return 'INFORMATIONAL';
}

export async function detectWebhookFailures(supabase: SupabaseClient, merchantId: string) {
  // Check if multiple webhook failures happened in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: failures } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'failed')
    .gte('created_at', oneHourAgo);

  if (failures && failures.length >= 3) {
    const score = calculateScore('HIGH', 0, 100, 100); // High severity, no direct impact yet
    await supabase.from('exceptions').upsert({
      exception_id: `EXC_HOOK_${merchantId}_${Date.now()}`,
      merchant_id: merchantId,
      severity: getSeverityClassification(score),
      type: 'WEBHOOK_FAILURE_CASCADE',
      amount: 0,
      entity_type: 'merchant',
      entity_id: merchantId,
      confidence: 100,
      anomaly_score: score,
      status: 'open'
    });
  }
}

export async function detectSettlementVariance(supabase: SupabaseClient, settlementId: string) {
  const { data: settlement } = await supabase.from('settlements').select('*').eq('settlement_id', settlementId).single();
  if (!settlement) return;

  const { data: items } = await supabase.from('settlement_items').select('net_amount').eq('settlement_id', settlementId);
  if (!items) return;

  const expected = items.reduce((acc, item) => acc + Number(item.net_amount), 0);
  const actual = Number(settlement.amount);
  const variance = Math.abs(expected - actual);

  if (variance > 0) {
    const score = calculateScore(variance > 1000000 ? 'CRITICAL' : 'HIGH', variance, 100, 100);
    await supabase.from('exceptions').upsert({
      exception_id: `EXC_VAR_${settlementId}`,
      merchant_id: settlement.merchant_id,
      severity: getSeverityClassification(score),
      type: 'SETTLEMENT_VARIANCE',
      amount: variance,
      entity_type: 'settlement',
      entity_id: settlementId,
      confidence: 100,
      anomaly_score: score,
      status: 'open'
    });
  }
}

export async function detectDuplicateBankTransactions(supabase: SupabaseClient, utr: string) {
  const { data: txns } = await supabase.from('bank_transactions').select('*').eq('utr', utr);
  if (txns && txns.length > 1) {
    const amount = Number(txns[0].credit) || Number(txns[0].debit);
    const score = calculateScore('CRITICAL', amount, 100, 100);
    
    await supabase.from('exceptions').upsert({
      exception_id: `EXC_DUP_${utr}`,
      merchant_id: txns[0].bank_account_id, // we might not have merchantId directly on bank_txn if missing, but bank accounts have it
      severity: getSeverityClassification(score),
      type: 'DUPLICATE_TRANSACTION',
      amount: amount,
      entity_type: 'bank_transaction',
      entity_id: utr,
      confidence: 100,
      anomaly_score: score,
      status: 'open'
    });
  }
}

export async function detectPaymentDegradation(supabase: SupabaseClient, merchantId: string) {
  // Compare last 1 hour success rate to 30 day baseline
  const { data: baseline } = await supabase.from('merchant_baselines')
    .select('value')
    .eq('merchant_id', merchantId)
    .eq('metric_name', 'payment_success_rate')
    .eq('window_days', 30)
    .single();
    
  if (!baseline) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase.from('payments')
    .select('status, amount')
    .eq('merchant_id', merchantId)
    .gte('created_at', oneHourAgo);

  if (recent && recent.length > 10) {
    const success = recent.filter(p => p.status === 'captured').length;
    const currentRate = (success / recent.length) * 100;
    
    const deviation = baseline.value - currentRate;
    
    // If dropped by more than 10%
    if (deviation > 10) {
      const impactedAmount = recent.filter(p => p.status !== 'captured').reduce((a, b) => a + Number(b.amount), 0);
      const score = calculateScore('HIGH', impactedAmount, deviation, 90);
      
      await supabase.from('exceptions').upsert({
        exception_id: `EXC_PAY_DEG_${merchantId}_${Date.now()}`,
        merchant_id: merchantId,
        severity: getSeverityClassification(score),
        type: 'PAYMENT_SUCCESS_DEGRADATION',
        amount: impactedAmount,
        entity_type: 'merchant',
        entity_id: merchantId,
        confidence: 90,
        anomaly_score: score,
        status: 'open'
      });
    }
  }
}

export async function detectRefundSpike(supabase: SupabaseClient, merchantId: string) {
  const { data: baseline } = await supabase.from('merchant_baselines')
    .select('value')
    .eq('merchant_id', merchantId)
    .eq('metric_name', 'refund_rate')
    .eq('window_days', 30)
    .single();
    
  if (!baseline) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentRefunds } = await supabase.from('refunds')
    .select('amount')
    .eq('merchant_id', merchantId)
    .gte('created_at', oneHourAgo);

  const { count: recentPayments } = await supabase.from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .gte('created_at', oneHourAgo)
    .eq('status', 'captured');

  if (recentRefunds && recentPayments && recentPayments > 0) {
    const currentRate = (recentRefunds.length / recentPayments) * 100;
    const deviation = currentRate - baseline.value;

    if (deviation > 5) { // 5% spike
      const totalRefunded = recentRefunds.reduce((a, b) => a + Number(b.amount), 0);
      const score = calculateScore('HIGH', totalRefunded, deviation, 95);

      await supabase.from('exceptions').upsert({
        exception_id: `EXC_REF_SPIKE_${merchantId}_${Date.now()}`,
        merchant_id: merchantId,
        severity: getSeverityClassification(score),
        type: 'REFUND_SPIKE',
        amount: totalRefunded,
        entity_type: 'merchant',
        entity_id: merchantId,
        confidence: 95,
        anomaly_score: score,
        status: 'open'
      });
    }
  }
}

export async function evaluateAllAnomalies(supabase: SupabaseClient, merchantId: string, settlementId?: string, utr?: string) {
  await detectWebhookFailures(supabase, merchantId);
  await detectPaymentDegradation(supabase, merchantId);
  await detectRefundSpike(supabase, merchantId);
  
  if (settlementId) {
    await detectSettlementVariance(supabase, settlementId);
  }
  
  if (utr) {
    await detectDuplicateBankTransactions(supabase, utr);
  }
}
