// @ts-nocheck
import { SupabaseClient } from '@supabase/supabase-js';

export class EvidenceEngine {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Validates that an evidence entity actually exists in the database.
   */
  async validateEvidence(entityType: string, entityId: string): Promise<boolean> {
    const table = this.getTableName(entityType);
    if (!table) return false;

    const idColumn = `${entityType}_id`;

    try {
      const { data, error } = await this.supabase
        .from(table)
        .select(idColumn)
        .eq(idColumn, entityId)
        .single();

      if (error || !data) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Records a validated finding with its associated evidence to the DB.
   */
  async recordFinding(investigationId: string, text: string, confidence: number, evidencePairs: Array<{type: string, id: string}>) {
    // Validate all evidence
    const validated = [];
    for (const pair of evidencePairs) {
      if (await this.validateEvidence(pair.type, pair.id)) {
        validated.push(pair);
      }
    }

    if (validated.length === 0 && evidencePairs.length > 0) {
      // If evidence was provided but failed verification, reject the finding
      throw new Error(`Finding REJECTED: Evidence failed verification for finding "${text}"`);
    }

    // Insert finding
    const findingId = `FND_${Date.now()}`;
    await this.supabase.from('ai_findings').insert({
      finding_id: findingId,
      investigation_id: investigationId,
      finding_text: text,
      confidence
    });

    // Insert evidence links
    for (const v of validated) {
      await this.supabase.from('evidence').insert({
        evidence_id: `EVD_${Date.now()}_${v.id}`,
        investigation_id: investigationId,
        entity_type: v.type,
        entity_id: v.id,
        source: 'db',
        relevance_score: confidence
      });
    }

    return findingId;
  }

  private getTableName(entityType: string): string | null {
    const map: Record<string, string> = {
      'settlement': 'settlements',
      'payment': 'payments',
      'refund': 'refunds',
      'adjustment': 'adjustments',
      'dispute': 'disputes',
      'bank_transaction': 'bank_transactions'
    };
    return map[entityType] || null;
  }
}
