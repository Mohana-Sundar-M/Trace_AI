import { SupabaseClient } from '@supabase/supabase-js';
import { determineSeverity } from './severity';
import { ReconcileResult } from '../reconciliation/reconciler';

export type ExceptionType = 
  | 'SETTLEMENT_VARIANCE'
  | 'MISSING_SETTLEMENT'
  | 'DUPLICATE_SETTLEMENT'
  | 'BANK_MISMATCH'
  | 'UTR_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'PARTIAL_SETTLEMENT'
  | 'ORPHAN_PAYMENT'
  | 'UNRESOLVED';

export interface ExceptionRecord {
  type: ExceptionType;
  severity: string;
  amount: number;
  entity_type: string;
  entity_id: string;
  confidence: number;
  merchant_id: string;
}

/**
 * Detects exceptions based on reconciliation results and records them to the DB.
 */
export async function detectAndRecordExceptions(
  supabase: SupabaseClient,
  merchantId: string,
  entityType: string,
  entityId: string,
  reconcileResult: ReconcileResult
): Promise<ExceptionRecord | null> {
  let exception: ExceptionRecord | null = null;

  if (reconcileResult.status === 'MISMATCH' || reconcileResult.status === 'PARTIAL') {
    exception = {
      type: 'SETTLEMENT_VARIANCE',
      severity: determineSeverity(reconcileResult.variance),
      amount: Math.abs(reconcileResult.variance),
      entity_type: entityType,
      entity_id: entityId,
      confidence: 100, // Deterministic
      merchant_id: merchantId
    };
  } else if (reconcileResult.status === 'UNRESOLVED') {
    exception = {
      type: 'UNRESOLVED',
      severity: determineSeverity(reconcileResult.variance || 0),
      amount: Math.abs(reconcileResult.variance || 0),
      entity_type: entityType,
      entity_id: entityId,
      confidence: 50,
      merchant_id: merchantId
    };
  }

  if (exception) {
    const { error } = await supabase.from('exceptions').insert({
      exception_id: `EXC_${Date.now()}`,
      merchant_id: exception.merchant_id,
      type: exception.type,
      severity: exception.severity,
      amount: exception.amount,
      entity_type: exception.entity_type,
      entity_id: exception.entity_id,
      confidence: exception.confidence,
      status: 'open'
    });

    if (error) {
      console.error(`Failed to record exception for ${entityId}:`, error);
    }
  }

  return exception;
}
