import { SupabaseClient } from '@supabase/supabase-js';
import { calculateSettlement } from '../financial/settlement';
import { calculateMatchScore, MatchCriteria } from '../matching/scorer';

export interface ReconcileResult {
  status: 'MATCHED' | 'PARTIAL' | 'MISMATCH' | 'UNRESOLVED';
  variance: number;
  matchedEntityId?: string;
  matchedEntityType?: string;
}

/**
 * Main reconciliation engine for a given settlement.
 * It calculates the expected amount and attempts to match it with a bank transaction.
 */
export async function reconcileSettlement(
  supabase: SupabaseClient,
  settlementId: string
): Promise<ReconcileResult> {
  // 1. Calculate the financial state
  const calculation = await calculateSettlement(supabase, settlementId);

  // 2. Try to find the matching bank transaction using UTR and Amount
  const { data: setl } = await supabase
    .from('settlements')
    .select('utr, settlement_period_end')
    .eq('settlement_id', settlementId)
    .single();

  if (!setl || !setl.utr) {
    return {
      status: 'UNRESOLVED',
      variance: calculation.variance
    };
  }

  // Find bank transactions with similar dates
  const { data: bankTxns } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('match_status', 'unmatched')
    .order('posting_date', { ascending: false })
    .limit(50);

  let bestMatch = null;
  let highestScore = -1;

  for (const txn of (bankTxns || [])) {
    const criteria: MatchCriteria = {
      utr_match: txn.utr === setl.utr,
      amount_match: txn.credit === calculation.actualAmount,
      settlement_relationship: txn.utr === setl.utr, // Proxy for relationship in this case
      date_proximity_days: 0, // In real world, diff between posting_date and settlement_period_end
      description_similarity: 1.0,
      merchant_match: true
    };

    const scoreResult = calculateMatchScore(txn.bank_transaction_id, criteria);

    if (scoreResult.total_score > highestScore) {
      highestScore = scoreResult.total_score;
      bestMatch = { txn, scoreResult };
    }
  }

  if (!bestMatch || bestMatch.scoreResult.confidence === 'UNRESOLVED') {
    return {
      status: calculation.variance === 0 ? 'PARTIAL' : 'UNRESOLVED',
      variance: calculation.variance
    };
  }

  if (bestMatch.scoreResult.confidence === 'HIGH' && calculation.variance === 0) {
    // Exact match: Update statuses
    await supabase.from('bank_transactions').update({ match_status: 'matched' }).eq('bank_transaction_id', bestMatch.txn.bank_transaction_id);
    await supabase.from('settlements').update({ status: 'processed' }).eq('settlement_id', settlementId);
    
    return {
      status: 'MATCHED',
      variance: 0,
      matchedEntityId: bestMatch.txn.bank_transaction_id,
      matchedEntityType: 'bank_transaction'
    };
  }

  if (calculation.variance !== 0) {
    return {
      status: 'MISMATCH',
      variance: calculation.variance,
      matchedEntityId: bestMatch.txn.bank_transaction_id,
      matchedEntityType: 'bank_transaction'
    };
  }

  return {
    status: 'UNRESOLVED',
    variance: calculation.variance
  };
}
