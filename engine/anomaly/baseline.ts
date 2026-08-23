import { SupabaseClient } from '@supabase/supabase-js';

export async function calculateMerchantBaselines(supabase: SupabaseClient, merchantId: string) {
  const windows = [7, 30, 90];

  for (const days of windows) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // 1. Payment Success Rate
    const { data: payments } = await supabase
      .from('payments')
      .select('status')
      .eq('merchant_id', merchantId)
      .gte('created_at', startDateStr);
    
    let paymentSuccessRate = 100;
    if (payments && payments.length > 0) {
      const successful = payments.filter(p => p.status === 'captured').length;
      paymentSuccessRate = (successful / payments.length) * 100;
    }

    // 2. Refund Rate
    // (Number of refunds / Number of successful payments)
    const { count: refundsCount } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .gte('created_at', startDateStr);

    let refundRate = 0;
    if (payments && payments.length > 0) {
       const successful = payments.filter(p => p.status === 'captured').length;
       if (successful > 0) {
         refundRate = ((refundsCount || 0) / successful) * 100;
       }
    }

    // 3. Dispute Rate
    const { count: disputesCount } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .gte('created_at', startDateStr);

    let disputeRate = 0;
    if (payments && payments.length > 0) {
       const successful = payments.filter(p => p.status === 'captured').length;
       if (successful > 0) {
         disputeRate = ((disputesCount || 0) / successful) * 100;
       }
    }

    // 4. Webhook Reliability (Success / Total Attempts)
    // Actually we only store webhook_events and event_attempts
    // We can approximate by looking at webhook_events status = 'processed' vs 'failed'
    const { data: webhooks } = await supabase
      .from('webhook_events')
      .select('status')
      .eq('merchant_id', merchantId)
      .gte('created_at', startDateStr);

    let webhookReliability = 100;
    if (webhooks && webhooks.length > 0) {
      const processed = webhooks.filter(w => w.status === 'processed').length;
      webhookReliability = (processed / webhooks.length) * 100;
    }

    // Save to merchant_baselines
    const baselines = [
      { metric_name: 'payment_success_rate', value: paymentSuccessRate },
      { metric_name: 'refund_rate', value: refundRate },
      { metric_name: 'dispute_rate', value: disputeRate },
      { metric_name: 'webhook_reliability', value: webhookReliability }
    ];

    for (const b of baselines) {
      await supabase.from('merchant_baselines').upsert({
        baseline_id: `BL_${merchantId}_${b.metric_name}_${days}`,
        merchant_id: merchantId,
        metric_name: b.metric_name,
        window_days: days,
        value: b.value,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'baseline_id' });
    }
  }

  // Update Merchant Health Score (Deterministic)
  // Base 100
  // -1 for every 1% drop in payment success below 95%
  // -2 for every 1% increase in refund rate above 5%
  // -5 for every 1% increase in dispute rate above 1%
  // -1 for every 1% drop in webhook reliability below 99%
  
  // Get 30-day baselines for health score
  const { data: thirtyDay } = await supabase
    .from('merchant_baselines')
    .select('metric_name, value')
    .eq('merchant_id', merchantId)
    .eq('window_days', 30);

  let healthScore = 100;
  let successRate = 100;
  let refundRate = 0;
  let disputeRate = 0;
  let hookRel = 100;

  if (thirtyDay) {
    thirtyDay.forEach(b => {
      if (b.metric_name === 'payment_success_rate') successRate = b.value;
      if (b.metric_name === 'refund_rate') refundRate = b.value;
      if (b.metric_name === 'dispute_rate') disputeRate = b.value;
      if (b.metric_name === 'webhook_reliability') hookRel = b.value;
    });
  }

  if (successRate < 95) healthScore -= (95 - successRate);
  if (refundRate > 5) healthScore -= (refundRate - 5) * 2;
  if (disputeRate > 1) healthScore -= (disputeRate - 1) * 5;
  if (hookRel < 99) healthScore -= (99 - hookRel);

  healthScore = Math.max(0, Math.min(100, healthScore)); // Bound 0-100

  let status = 'Healthy';
  if (healthScore < 50) status = 'Critical';
  else if (healthScore < 75) status = 'At Risk';
  else if (healthScore < 90) status = 'Watch';

  await supabase.from('merchant_health').upsert({
    merchant_id: merchantId,
    health_score: healthScore,
    status,
    payment_success_rate: successRate,
    refund_rate: refundRate,
    dispute_rate: disputeRate,
    webhook_reliability: hookRel,
    last_updated: new Date().toISOString()
  });

  return { healthScore, status };
}
