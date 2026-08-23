import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
}

export type WorkflowAction = 
  | 'APPROVE_RECOMMENDATION'
  | 'REJECT_RECOMMENDATION'
  | 'ESCALATE'
  | 'MARK_RECONCILED'
  | 'CLOSE_CASE'
  | 'REQUEST_VERIFICATION'
  | 'MARK_FALSE_POSITIVE';

export interface WorkflowRequest {
  action: WorkflowAction;
  entityType: string;
  entityId: string;
  role: string;
  actor: string;
  merchantId: string;
  reason?: string;
}

const ROLE_PERMISSIONS: Record<string, WorkflowAction[]> = {
  SYSTEM_ADMIN: ['APPROVE_RECOMMENDATION', 'REJECT_RECOMMENDATION', 'ESCALATE', 'MARK_RECONCILED', 'CLOSE_CASE', 'REQUEST_VERIFICATION', 'MARK_FALSE_POSITIVE'],
  FINANCE_MANAGER: ['APPROVE_RECOMMENDATION', 'REJECT_RECOMMENDATION', 'ESCALATE', 'MARK_RECONCILED', 'CLOSE_CASE', 'REQUEST_VERIFICATION', 'MARK_FALSE_POSITIVE'],
  FINANCE_ANALYST: ['REJECT_RECOMMENDATION', 'ESCALATE', 'REQUEST_VERIFICATION', 'MARK_FALSE_POSITIVE'],
  RISK_OPERATIONS: ['ESCALATE', 'REQUEST_VERIFICATION'],
  MERCHANT_ADMIN: [], // Read-only on operational resolutions
  AUDITOR: [], // Read-only
};

export class WorkflowMachine {
  
  static async execute(req: WorkflowRequest) {
    const { action, entityType, entityId, role, actor, merchantId, reason } = req;
    
    // 1. Validate Permission
    const allowedActions = ROLE_PERMISSIONS[role] || [];
    if (!allowedActions.includes(action)) {
      throw new Error(`Permission Denied: Role ${role} cannot execute ${action}`);
    }

    // 2. Fetch current state
    let table = '';
    let idColumn = '';
    
    if (entityType.toUpperCase() === 'INCIDENT') {
      table = 'incidents';
      idColumn = 'incident_id';
    } else if (entityType.toUpperCase() === 'EXCEPTION') {
      table = 'exceptions';
      idColumn = 'exception_id';
    } else if (entityType.toUpperCase() === 'SETTLEMENT') {
      table = 'settlements';
      idColumn = 'settlement_id';
    } else if (entityType.toUpperCase() === 'PAYMENT') {
      table = 'payments';
      idColumn = 'payment_id';
    } else if (entityType.toUpperCase() === 'REFUND') {
      table = 'refunds';
      idColumn = 'refund_id';
    } else if (entityType.toUpperCase() === 'DISPUTE') {
      table = 'disputes';
      idColumn = 'dispute_id';
    } else {
      throw new Error(`Unsupported entity type for workflow action: ${entityType}`);
    }

    const supabase = getSupabase();
    const { data: entity, error: fetchErr } = await supabase
      .from(table)
      .select('*')
      .eq(idColumn, entityId)
      .eq('merchant_id', merchantId)
      .single();

    if (fetchErr || !entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    // 3. Determine new state
    let newStatus = entity.status;
    
    switch (action) {
      case 'APPROVE_RECOMMENDATION':
      case 'MARK_RECONCILED':
      case 'CLOSE_CASE':
      case 'MARK_FALSE_POSITIVE':
        newStatus = 'RESOLVED';
        break;
      case 'REJECT_RECOMMENDATION':
        newStatus = 'HUMAN_REJECTED';
        break;
      case 'ESCALATE':
      case 'REQUEST_VERIFICATION':
        newStatus = 'ESCALATED';
        break;
    }

    // 4. Update Database
    const updatePayload: any = { status: newStatus };
    if ((table === 'exceptions' || table === 'incidents') && newStatus === 'RESOLVED') {
      updatePayload.resolved_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from(table)
      .update(updatePayload)
      .eq(idColumn, entityId);

    if (updateErr) throw new Error(`Failed to update entity status: ${updateErr.message}`);

    // 5. Create Audit Log
    const { error: auditErr } = await supabase
      .from('audit_logs')
      .insert({
        audit_id: `AUD_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        merchant_id: merchantId,
        actor_type: 'USER',
        actor_id: actor,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        before_state: { status: entity.status },
        after_state: { status: newStatus },
        reason: reason || action,
        timestamp: new Date().toISOString()
      });

    if (auditErr) throw new Error(`Failed to create audit log: ${auditErr.message}`);

    return { success: true, newStatus, message: `Action ${action} executed successfully` };
  }
}
