/**
 * Financial engine core utilities for TRACE.
 * All functions must be deterministic and operate strictly on integer paise values.
 * Never use floating-point arithmetic for financial calculations.
 */

/**
 * Ensures the value is an integer.
 * Throws an error if a float is passed, ensuring strict compliance.
 */
function enforceInteger(value: number, paramName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`[FinancialEngine Error] Expected integer for ${paramName}, but got float: ${value}`);
  }
}

/**
 * Adds two money values in paise.
 */
export function addMoney(a: number, b: number): number {
  enforceInteger(a, 'a');
  enforceInteger(b, 'b');
  return a + b;
}

/**
 * Subtracts two money values in paise (a - b).
 */
export function subtractMoney(a: number, b: number): number {
  enforceInteger(a, 'a');
  enforceInteger(b, 'b');
  return a - b;
}

/**
 * Multiplies a money value by an integer factor.
 */
export function multiplyMoney(amount: number, factor: number): number {
  enforceInteger(amount, 'amount');
  enforceInteger(factor, 'factor');
  return amount * factor;
}

/**
 * Sums an array of money values in paise.
 */
export function sumMoney(amounts: number[]): number {
  return amounts.reduce((total, amt) => {
    enforceInteger(amt, 'array element');
    return total + amt;
  }, 0);
}

/**
 * Formats integer paise into an INR string (e.g., ₹1,250.50).
 */
export function formatINR(paise: number): string {
  enforceInteger(paise, 'paise');
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;
  
  // Format with commas using Indian numbering system
  const formattedRupees = rupees.toLocaleString('en-IN');
  const formattedPaise = remainingPaise.toString().padStart(2, '0');
  
  return `${isNegative ? '-' : ''}₹${formattedRupees}.${formattedPaise}`;
}
