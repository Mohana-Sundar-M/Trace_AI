export interface SettlementCalculationParams {
  gross_payments: number;
  refunds: number;
  disputes: number;
  fees: number;
  tax: number;
  adjustments: number;
}

export interface SettlementVarianceResult {
  expected_settlement: number;
  actual_settlement: number;
  variance: number;
  is_match: boolean;
  components: SettlementCalculationParams;
}

/**
 * Calculates the expected settlement amount deterministically.
 * ALL amounts MUST be in paise to avoid floating point errors.
 */
export function calculateExpectedSettlement(params: SettlementCalculationParams): number {
  // Gross Payments + Adjustments - Refunds - Disputes - Fees - Tax
  // Assuming adjustments are additive (positive = credit to merchant, negative = debit from merchant)
  // Assuming refunds, disputes, fees, tax are represented as positive numbers that need to be subtracted.
  
  return params.gross_payments 
       + params.adjustments 
       - params.refunds 
       - params.disputes 
       - params.fees 
       - params.tax;
}

/**
 * Compares the expected settlement with the actual settlement received.
 */
export function compareSettlement(
  params: SettlementCalculationParams, 
  actual_settlement: number
): SettlementVarianceResult {
  const expected = calculateExpectedSettlement(params);
  const variance = expected - actual_settlement; // positive means shortfall
  
  return {
    expected_settlement: expected,
    actual_settlement: actual_settlement,
    variance: variance,
    is_match: variance === 0,
    components: params
  };
}
