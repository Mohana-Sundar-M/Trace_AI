// Vercel Serverless Function: /api/graph/[type]/[id]
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let type = req.query.type;
    let id = req.query.id;

    // Robust extraction from URL if rewrites didn't set req.query
    if (!type || !id) {
      const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
      // e.g. /api/graph/payment/PAY_123 -> ['api', 'graph', 'payment', 'PAY_123']
      const graphIdx = urlParts.indexOf('graph');
      if (graphIdx !== -1 && urlParts.length >= graphIdx + 3) {
        type = urlParts[graphIdx + 1];
        id = urlParts[graphIdx + 2];
      }
    }

    if (!type || !id) {
      return res.status(400).json({ error: 'Missing type or id parameters' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let nodes = [];
    let edges = [];

    if (type === 'payment') {
      const { data: payment } = await supabase.from('payments').select('*').eq('payment_id', id).single();
      if (payment) {
        nodes.push({ id: payment.payment_id, type: 'payment', data: payment, label: payment.payment_id });
        
        if (payment.settlement_id) {
          const { data: settlement } = await supabase.from('settlements').select('*').eq('settlement_id', payment.settlement_id).single();
          if (settlement) {
            nodes.push({ id: settlement.settlement_id, type: 'settlement', data: settlement, label: settlement.settlement_id });
            edges.push({ from: payment.payment_id, to: settlement.settlement_id, label: 'settles_to' });
          }
        }
        
        const { data: refunds } = await supabase.from('refunds').select('*').eq('payment_id', id);
        (refunds || []).forEach(r => {
          nodes.push({ id: r.refund_id, type: 'refund', data: r, label: r.refund_id });
          edges.push({ from: id, to: r.refund_id, label: 'refunded_by' });
        });
        
        const { data: disputes } = await supabase.from('disputes').select('*').eq('payment_id', id);
        (disputes || []).forEach(d => {
          nodes.push({ id: d.dispute_id, type: 'dispute', data: d, label: d.dispute_id });
          edges.push({ from: id, to: d.dispute_id, label: 'disputed_as' });
        });
      }
    } else if (type === 'settlement') {
      const { data: settlement } = await supabase.from('settlements').select('*').eq('settlement_id', id).single();
      if (settlement) {
        nodes.push({ id: settlement.settlement_id, type: 'settlement', data: settlement, label: settlement.settlement_id });
        const { data: payments } = await supabase.from('payments').select('*').eq('settlement_id', id);
        (payments || []).forEach(p => {
          nodes.push({ id: p.payment_id, type: 'payment', data: p, label: p.payment_id });
          edges.push({ from: p.payment_id, to: id, label: 'settles_to' });
        });
      }
    } else if (type === 'exception') {
      const { data: exception } = await supabase.from('exceptions').select('*').eq('exception_id', id).single();
      if (exception) {
        nodes.push({ id: exception.exception_id, type: 'exception', data: exception, label: exception.exception_id });
        if (exception.entity_type && exception.entity_id) {
          nodes.push({ id: exception.entity_id, type: exception.entity_type, label: exception.entity_id });
          edges.push({ from: exception.exception_id, to: exception.entity_id, label: 'linked_to' });
        }
      }
    } else if (type === 'incident') {
      const { data: incident } = await supabase.from('incidents').select('*').eq('incident_id', id).single();
      if (incident) {
        nodes.push({ id: incident.incident_id, type: 'incident', data: incident, label: incident.incident_id });
      }
    }

    res.json({ nodes, edges });
  } catch (error) {
    console.error('Graph build error:', error);
    res.status(500).json({ error: error.message });
  }
}
