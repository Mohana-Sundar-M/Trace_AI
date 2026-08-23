import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Anomaly Injection Engine
 * Safely mutates underlying database records to test detection capabilities.
 */
export class AnomalyInjector {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Modifies an adjustment record to inject an amount mismatch.
   */
  async injectAmountMismatch(adjustmentId: string, newAmount: number, caseId: string) {
    const { data, error } = await this.supabase
      .from('adjustments')
      .update({ amount: newAmount })
      .eq('adjustment_id', adjustmentId)
      .select('settlement_id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to inject amount mismatch on ${adjustmentId}: ${error?.message}`);
    }

    // Record ground truth benchmark case
    await this.recordBenchmarkCase({
      case_id: caseId,
      scenario_type: 'SETTLEMENT_VARIANCE',
      entity_id: data.settlement_id,
      ground_truth_type: 'AMOUNT_MISMATCH',
      ground_truth_amount: newAmount,
      expected_resolution: 'HUMAN_REVIEW'
    });

    return data;
  }

  /**
   * Deletes a settlement record to simulate a missing settlement.
   */
  async injectMissingSettlement(settlementId: string, caseId: string) {
    // We update status instead of hard delete to preserve foreign keys
    const { error } = await this.supabase
      .from('settlements')
      .update({ status: 'failed', utr: null })
      .eq('settlement_id', settlementId);

    if (error) {
      throw new Error(`Failed to inject missing settlement on ${settlementId}: ${error.message}`);
    }

    await this.recordBenchmarkCase({
      case_id: caseId,
      scenario_type: 'MISSING_SETTLEMENT',
      entity_id: settlementId,
      ground_truth_type: 'MISSING',
      ground_truth_amount: 0,
      expected_resolution: 'HUMAN_REVIEW'
    });
  }

  private async recordBenchmarkCase(params: {
    case_id: string;
    scenario_type: string;
    entity_id: string;
    ground_truth_type: string;
    ground_truth_amount: number;
    expected_resolution: string;
  }) {
    await this.supabase.from('benchmark_cases').insert(params);
  }
}
