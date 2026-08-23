export interface CandidateMatchScore {
  candidate_id: string;
  total_score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
  reasons: string[];
}

export interface MatchCriteria {
  utr_match: boolean;
  amount_match: boolean;
  settlement_relationship: boolean;
  date_proximity_days: number;
  description_similarity: number; // 0 to 1
  merchant_match: boolean;
}

/**
 * Calculates a match score based on deterministic criteria.
 * 
 * Rules:
 * UTR exact match: 40 points
 * Amount exact: 20 points
 * Settlement relationship: 20 points
 * Date proximity: 10 points (within 2 days)
 * Description similarity: 5 points
 * Merchant match: 5 points
 */
export function calculateMatchScore(candidate_id: string, criteria: MatchCriteria): CandidateMatchScore {
  let score = 0;
  const reasons: string[] = [];

  if (criteria.utr_match) {
    score += 40;
    reasons.push('Exact UTR match (40 pts)');
  }

  if (criteria.amount_match) {
    score += 20;
    reasons.push('Exact amount match (20 pts)');
  }

  if (criteria.settlement_relationship) {
    score += 20;
    reasons.push('Settlement relationship verified (20 pts)');
  }

  if (criteria.date_proximity_days <= 2) {
    const proximityScore = Math.max(0, 10 - (criteria.date_proximity_days * 3));
    score += proximityScore;
    reasons.push(`Date proximity: ${criteria.date_proximity_days} days (${proximityScore.toFixed(0)} pts)`);
  }

  if (criteria.description_similarity > 0.5) {
    const descScore = Math.round(criteria.description_similarity * 5);
    score += descScore;
    reasons.push(`Description similarity (${descScore} pts)`);
  }

  if (criteria.merchant_match) {
    score += 5;
    reasons.push('Merchant match (5 pts)');
  }

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED' = 'UNRESOLVED';
  
  if (score >= 90) confidence = 'HIGH';
  else if (score >= 70) confidence = 'MEDIUM';
  else if (score >= 50) confidence = 'LOW';
  else confidence = 'UNRESOLVED';

  return {
    candidate_id,
    total_score: score,
    confidence,
    reasons
  };
}
