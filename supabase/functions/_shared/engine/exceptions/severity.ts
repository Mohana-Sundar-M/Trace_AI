/**
 * Exception Severity Rules
 * Configurable thresholds for deterministic severity assignment.
 */

export type ExceptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SeverityThresholds {
  criticalAmount: number;
  highAmount: number;
  mediumAmount: number;
}

const DEFAULT_THRESHOLDS: SeverityThresholds = {
  criticalAmount: 10000000, // ₹1,00,000 (100k * 100 paise)
  highAmount: 2500000,      // ₹25,000
  mediumAmount: 500000,     // ₹5,000
};

/**
 * Assigns a severity level deterministically based on the variance amount.
 */
export function determineSeverity(
  variancePaise: number,
  thresholds: SeverityThresholds = DEFAULT_THRESHOLDS
): ExceptionSeverity {
  const absVariance = Math.abs(variancePaise);
  
  if (absVariance >= thresholds.criticalAmount) return 'CRITICAL';
  if (absVariance >= thresholds.highAmount) return 'HIGH';
  if (absVariance >= thresholds.mediumAmount) return 'MEDIUM';
  return 'LOW';
}
