// Vercel Serverless Function: /api/workflow
import { createClient } from '@supabase/supabase-js';

const VALID_ACTIONS = ['APPROVE_RECOMMENDATION', 'REJECT_RECOMMENDATION', 'ESCALATE', 'REQUEST_REFUND', 'CLOSE_EXCEPTION'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ai-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, entityType, entityId, merchantId, investigation_id, reason } = req.body;

    if (!action || !entityType || !entityId) {
      return res.status(400).json({ error: 'Missing required fields: action, entityType, entityId' });
    }

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: `Unsupported action: ${action}. Valid: ${VALID_ACTIONS.join(', ')}` });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let updateResult;

    if (action === 'APPROVE_RECOMMENDATION' || action === 'REJECT_RECOMMENDATION') {
      const newStatus = action === 'APPROVE_RECOMMENDATION' ? 'HUMAN_APPROVED' : 'HUMAN_REJECTED';

      if (entityType === 'exception') {
        updateResult = await supabase.from('exceptions').update({ status: newStatus }).eq('exception_id', entityId);
      } else if (entityType === 'incident') {
        updateResult = await supabase.from('incidents').update({ status: newStatus === 'HUMAN_APPROVED' ? 'RESOLVED' : 'HUMAN_REJECTED' }).eq('incident_id', entityId);
      } else if (entityType === 'settlement') {
        updateResult = await supabase.from('settlements').update({ status: newStatus === 'HUMAN_APPROVED' ? 'APPROVED' : 'DISPUTED' }).eq('settlement_id', entityId);
      }

      // Update investigation record if linked
      if (investigation_id) {
        await supabase.from('investigations').update({
          status: 'completed',
          human_decision: action,
          human_decision_reason: reason || ''
        }).eq('investigation_id', investigation_id);
      }

      // Log to audit trail
      await supabase.from('audit_log').insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        merchant_id: merchantId,
        performed_by: 'FINANCE_MANAGER',
        notes: reason || `${action} via TRACE workflow`
      });
    } else if (action === 'ESCALATE') {
      if (entityType === 'exception') {
        updateResult = await supabase.from('exceptions').update({ status: 'ESCALATED', priority: 'CRITICAL' }).eq('exception_id', entityId);
      }
      await supabase.from('audit_log').insert({
        action: 'ESCALATE',
        entity_type: entityType,
        entity_id: entityId,
        merchant_id: merchantId,
        performed_by: 'OPERATIONS_ANALYST',
        notes: reason || 'Escalated via TRACE'
      });
    } else if (action === 'CLOSE_EXCEPTION') {
      updateResult = await supabase.from('exceptions').update({ status: 'CLOSED' }).eq('exception_id', entityId);
    }

    res.json({ success: true, action, entityId, entityType, message: `${action} applied successfully.` });
  } catch (error) {
    console.error('Workflow error:', error);
    res.status(500).json({ error: error.message });
  }
}
