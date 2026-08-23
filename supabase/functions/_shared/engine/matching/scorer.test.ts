import { describe, it, expect } from 'vitest';
import { calculateMatchScore, MatchCriteria } from './scorer';

describe('Financial Engine: Matching Scorer', () => {
  it('returns HIGH confidence for exact matches', () => {
    const criteria: MatchCriteria = {
      utr_match: true, // 40
      amount_match: true, // 20
      settlement_relationship: true, // 20
      date_proximity_days: 0, // 10
      description_similarity: 1.0, // 5
      merchant_match: true // 5
    };
    
    // Total = 100
    const result = calculateMatchScore('txn_123', criteria);
    expect(result.total_score).toBe(100);
    expect(result.confidence).toBe('HIGH');
  });

  it('returns MEDIUM confidence for partial match without UTR', () => {
    const criteria: MatchCriteria = {
      utr_match: false, // 0
      amount_match: true, // 20
      settlement_relationship: true, // 20
      date_proximity_days: 0, // 10
      description_similarity: 1.0, // 5
      merchant_match: true // 5
    };
    
    // Total = 60 (Wait, 20+20+10+5+5 = 60). This should be LOW confidence.
    const result = calculateMatchScore('txn_123', criteria);
    expect(result.total_score).toBe(60);
    expect(result.confidence).toBe('LOW');
  });

  it('returns MEDIUM confidence if UTR matches but amount varies slightly', () => {
    const criteria: MatchCriteria = {
      utr_match: true, // 40
      amount_match: false, // 0
      settlement_relationship: true, // 20
      date_proximity_days: 1, // 7
      description_similarity: 0.8, // 4
      merchant_match: true // 5
    };
    
    // Total = 40 + 20 + 7 + 4 + 5 = 76
    const result = calculateMatchScore('txn_123', criteria);
    expect(result.total_score).toBe(76);
    expect(result.confidence).toBe('MEDIUM');
  });

  it('returns UNRESOLVED for completely mismatched transactions', () => {
    const criteria: MatchCriteria = {
      utr_match: false,
      amount_match: false,
      settlement_relationship: false,
      date_proximity_days: 10,
      description_similarity: 0.1,
      merchant_match: false
    };
    
    const result = calculateMatchScore('txn_123', criteria);
    expect(result.total_score).toBeLessThan(50);
    expect(result.confidence).toBe('UNRESOLVED');
  });
});
