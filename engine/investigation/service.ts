import { SupabaseClient } from '@supabase/supabase-js';

export type InvestigationState = 
  | 'created' 
  | 'planning' 
  | 'retrieving' 
  | 'calculating' 
  | 'matching' 
  | 'analyzing' 
  | 'verifying' 
  | 'resolved'
  | 'partially_resolved'
  | 'unresolved'
  | 'human_review'
  | 'failed';

export class InvestigationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Starts a new investigation for a target entity (e.g. settlement).
   */
  async startInvestigation(merchantId: string, entityType: string, entityId: string, question: string) {
    const invId = `INV_${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    
    await this.supabase.from('investigations').insert({
      investigation_id: invId,
      merchant_id: merchantId,
      target_entity_type: entityType,
      target_entity_id: entityId,
      question,
      status: 'created'
    });

    return invId;
  }

  /**
   * Transitions the state machine and records the step.
   */
  async transitionState(investigationId: string, newState: InvestigationState, metadata: any = {}) {
    // 1. Update overall status
    await this.supabase.from('investigations').update({
      status: newState,
      updated_at: new Date().toISOString()
    }).eq('investigation_id', investigationId);

    // 2. Record the step
    const stepId = `STP_${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    await this.supabase.from('investigation_steps').insert({
      step_id: stepId,
      investigation_id: investigationId,
      step_type: newState,
      status: 'completed',
      metadata,
      completed_at: new Date().toISOString()
    });

    return stepId;
  }

  /**
   * Concludes the investigation with findings and resolution.
   */
  async concludeInvestigation(investigationId: string, params: {
    status: InvestigationState;
    rootCause: string;
    explainedAmount: number;
    unexplainedAmount: number;
    confidence: number;
    recommendedAction: string;
  }) {
    await this.transitionState(investigationId, params.status, params);

    await this.supabase.from('investigations').update({
      root_cause: params.rootCause,
      explained_amount: params.explainedAmount,
      unexplained_amount: params.unexplainedAmount,
      confidence: params.confidence,
      recommended_action: params.recommendedAction,
      updated_at: new Date().toISOString()
    }).eq('investigation_id', investigationId);
  }
}
