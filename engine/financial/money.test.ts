import { describe, it, expect } from 'vitest';
import { addMoney, subtractMoney, multiplyMoney, sumMoney, formatINR } from './money';

describe('Financial Engine: Money Utility', () => {
  describe('Integer Enforcement', () => {
    it('throws error when a float is passed to addMoney', () => {
      expect(() => addMoney(100.5, 200)).toThrow(/Expected integer/);
    });

    it('throws error when a float is passed to formatINR', () => {
      expect(() => formatINR(100.5)).toThrow(/Expected integer/);
    });
  });

  describe('Arithmetic Operations (Paise)', () => {
    it('correctly adds positive amounts', () => {
      expect(addMoney(15000, 2000)).toBe(17000);
    });

    it('correctly adds negative amounts', () => {
      expect(addMoney(15000, -2000)).toBe(13000);
    });

    it('correctly subtracts amounts', () => {
      expect(subtractMoney(15000, 2000)).toBe(13000);
    });

    it('correctly subtracts negative amounts (adds)', () => {
      expect(subtractMoney(15000, -2000)).toBe(17000);
    });

    it('correctly sums an array of amounts', () => {
      expect(sumMoney([1000, 2000, 3000, -500])).toBe(5500);
    });
  });

  describe('Formatting', () => {
    it('formats positive paise to INR correctly', () => {
      expect(formatINR(125050)).toBe('₹1,250.50');
      expect(formatINR(10000000)).toBe('₹1,00,000.00'); // Lakh formatting check
    });

    it('formats negative paise to INR correctly', () => {
      expect(formatINR(-50050)).toBe('-₹500.50');
    });

    it('formats zero correctly', () => {
      expect(formatINR(0)).toBe('₹0.00');
    });
  });
});
