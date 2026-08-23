import { SupabaseClient } from '@supabase/supabase-js';
import { addMoney, subtractMoney, sumMoney } from './money';

export interface SettlementEngineResult {
  settlementId: string;
  grossAmount: number;
  refunds: number;
  disputes: number;
  fees: number;
  tax: number;
  adjustments: number;
  expectedAmount: number;
  actualAmount: number;
  variance: number;
  status: 'MATCHED' | 'VARIANCE_DETECTED';
}

/**
 * Real Settlement Calculation Engine.
 * Retrieves all items belonging to a settlement and computes the expected value.
 */
export async function calculateSettlement(
  supabase: SupabaseClient, 
  settlementId: string
): Promise<SettlementEngineResult> {
  
  // 1. Fetch the settlement record to get actual processed amount
  const { data: settlement, error: setlError } = await supabase
    .from('settlements')
    .select('amount') // This is the net amount deposited
    .eq('settlement_id', settlementId)
    .maybeSingle();

  if (setlError) {
    throw new Error(`Failed to fetch settlement: ${setlError.message}`);
  }
  if (!settlement) {
    throw new Error(`Settlement ${settlementId} not found in database. Did you run the SQL seed script?`);
  }

  const actualAmount = settlement.amount;

  // 2. Fetch all components linked via settlement_items
  // Note: Depending on the schema, settlement_items might aggregate payments/refunds,
  // but we can query them directly by joining or aggregating.
  const { data: items, error: itemsError } = await supabase
    .from('settlement_items')
    .select(`
      gross_amount,
      fee,
      tax,
      payment_id,
      refund_id,
      dispute_id,
      adjustment_id
    `)
    .eq('settlement_id', settlementId);

  if (itemsError) {
    throw new Error(`Failed to fetch settlement items: ${itemsError.message}`);
  }

  let grossAmount = 0;
  let refunds = 0;
  let disputes = 0;
  let fees = 0;
  let tax = 0;
  let adjustments = 0;

  // Aggregate values
  // In a real system, we'd cross-reference the IDs with actual tables to ensure integrity,
  // but for the settlement formula, we use the reconciled item values.
  for (const item of (items || [])) {
    if (item.payment_id) {
      grossAmount = addMoney(grossAmount, item.gross_amount);
      fees = addMoney(fees, item.fee || 0);
      tax = addMoney(tax, item.tax || 0);
    } else if (item.refund_id) {
      refunds = addMoney(refunds, item.gross_amount); // Treat refunds as positive absolute values
      fees = addMoney(fees, item.fee || 0);
      tax = addMoney(tax, item.tax || 0);
    } else if (item.dispute_id) {
      disputes = addMoney(disputes, item.gross_amount);
      fees = addMoney(fees, item.fee || 0);
      tax = addMoney(tax, item.tax || 0);
    } else if (item.adjustment_id) {
      // Fetch actual adjustment to know its sign (credit/debit)
      const { data: adj } = await supabase
        .from('adjustments')
        .select('amount')
        .eq('adjustment_id', item.adjustment_id)
        .maybeSingle();
      
      if (adj) {
        adjustments = addMoney(adjustments, adj.amount);
      }
    }
  }

  // EXPECTED SETTLEMENT = GROSS PAYMENTS - REFUNDS - DISPUTES - FEES - TAX +/- ADJUSTMENTS
  let expectedAmount = grossAmount;
  expectedAmount = subtractMoney(expectedAmount, refunds);
  expectedAmount = subtractMoney(expectedAmount, disputes);
  expectedAmount = subtractMoney(expectedAmount, fees);
  expectedAmount = subtractMoney(expectedAmount, tax);
  expectedAmount = addMoney(expectedAmount, adjustments);

  // VARIANCE = EXPECTED SETTLEMENT - ACTUAL SETTLEMENT
  const variance = subtractMoney(expectedAmount, actualAmount);

  return {
    settlementId,
    grossAmount,
    refunds,
    disputes,
    fees,
    tax,
    adjustments,
    expectedAmount,
    actualAmount,
    variance,
    status: variance === 0 ? 'MATCHED' : 'VARIANCE_DETECTED'
  };
}
