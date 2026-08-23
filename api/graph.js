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

    // Robust extraction from URL path if rewrites didn't set req.query
    if (!type || !id) {
      const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
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
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase environment variables not set' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const nodes = [];
    const edges = [];

    const addNode = (nId, label, colorHex = '#3b82f6', x = 250, y = 150) => {
      if (!nodes.find(n => n.id === nId)) {
        nodes.push({
          id: String(nId),
          type: 'default',
          position: { x, y },
          data: { label: String(label) },
          style: {
            background: '#11161D',
            color: '#ffffff',
            border: `1.5px solid ${colorHex}`,
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '12px',
            fontFamily: 'monospace',
            boxShadow: `0 0 12px ${colorHex}33`
          }
        });
      }
    };

    const addEdge = (source, target, label = '', colorHex = '#64748b') => {
      const edgeId = `e-${source}-${target}`;
      if (!edges.find(e => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          source: String(source),
          target: String(target),
          label: String(label),
          animated: true,
          style: { stroke: colorHex, strokeWidth: 2 }
        });
      }
    };

    const normType = type.toLowerCase();

    if (normType === 'payment') {
      const { data: payment } = await supabase.from('payments').select('*').eq('payment_id', id).maybeSingle();
      
      addNode(id, `Payment: ${id}\n₹${((payment?.amount || 0) / 100).toFixed(2)}`, '#10b981', 250, 150);

      if (payment) {
        if (payment.settlement_id) {
          const { data: setl } = await supabase.from('settlements').select('*').eq('settlement_id', payment.settlement_id).maybeSingle();
          addNode(payment.settlement_id, `Settlement: ${payment.settlement_id}\n₹${((setl?.amount || 0) / 100).toFixed(2)}`, '#3b82f6', 500, 150);
          addEdge(id, payment.settlement_id, 'settles_to', '#3b82f6');
        }

        const { data: refunds } = await supabase.from('refunds').select('*').eq('payment_id', id);
        (refunds || []).forEach((r, idx) => {
          addNode(r.refund_id, `Refund: ${r.refund_id}\n₹${((r.amount || 0) / 100).toFixed(2)}`, '#f59e0b', 250, 300 + idx * 100);
          addEdge(id, r.refund_id, 'refunded_by', '#f59e0b');
        });

        const { data: disputes } = await supabase.from('disputes').select('*').eq('payment_id', id);
        (disputes || []).forEach((d, idx) => {
          addNode(d.dispute_id, `Dispute: ${d.dispute_id}\n₹${((d.amount || 0) / 100).toFixed(2)}`, '#ef4444', 50, 300 + idx * 100);
          addEdge(id, d.dispute_id, 'disputed_as', '#ef4444');
        });
      }

    } else if (normType === 'settlement') {
      const { data: setl } = await supabase.from('settlements').select('*').eq('settlement_id', id).maybeSingle();
      addNode(id, `Settlement: ${id}\n₹${((setl?.amount || 0) / 100).toFixed(2)}`, '#3b82f6', 300, 200);

      if (setl) {
        if (setl.utr) {
          addNode(`UTR-${setl.utr}`, `UTR: ${setl.utr}`, '#10b981', 550, 200);
          addEdge(id, `UTR-${setl.utr}`, 'processed_via', '#10b981');
        }

        const { data: items } = await supabase.from('settlement_items').select('*, payments(*), refunds(*)').eq('settlement_id', id);
        (items || []).forEach((item, idx) => {
          const yPos = 80 + idx * 90;
          if (item.payments) {
            const p = item.payments;
            addNode(p.payment_id, `Payment: ${p.payment_id}\n₹${((p.amount || 0) / 100).toFixed(2)}`, '#10b981', 50, yPos);
            addEdge(p.payment_id, id, 'included_in', '#10b981');
          } else if (item.refunds) {
            const r = item.refunds;
            addNode(r.refund_id, `Refund: ${r.refund_id}\n₹${((r.amount || 0) / 100).toFixed(2)}`, '#f59e0b', 50, yPos);
            addEdge(r.refund_id, id, 'deducted_in', '#f59e0b');
          }
        });

        const { data: excs } = await supabase.from('exceptions').select('*').eq('entity_type', 'settlement').eq('entity_id', id);
        (excs || []).forEach((e, idx) => {
          addNode(e.exception_id, `Exception: ${e.type}\n${e.status}`, '#ef4444', 300, 380 + idx * 80);
          addEdge(id, e.exception_id, 'flagged_exception', '#ef4444');
        });
      }

    } else if (normType === 'refund') {
      const { data: ref } = await supabase.from('refunds').select('*').eq('refund_id', id).maybeSingle();
      addNode(id, `Refund: ${id}\n₹${((ref?.amount || 0) / 100).toFixed(2)}`, '#f59e0b', 300, 200);

      if (ref?.payment_id) {
        const { data: payment } = await supabase.from('payments').select('*').eq('payment_id', ref.payment_id).maybeSingle();
        addNode(ref.payment_id, `Payment: ${ref.payment_id}\n₹${((payment?.amount || 0) / 100).toFixed(2)}`, '#10b981', 100, 200);
        addEdge(ref.payment_id, id, 'refund_of', '#f59e0b');
      }

    } else if (normType === 'exception') {
      const { data: exc } = await supabase.from('exceptions').select('*').eq('exception_id', id).maybeSingle();
      addNode(id, `Exception: ${id}\n${exc?.type || 'UNKNOWN'}`, '#ef4444', 250, 150);

      if (exc?.entity_type && exc?.entity_id) {
        addNode(exc.entity_id, `${exc.entity_type.toUpperCase()}: ${exc.entity_id}`, '#3b82f6', 500, 150);
        addEdge(id, exc.entity_id, 'pertains_to', '#ef4444');
      }

    } else if (normType === 'incident') {
      const { data: inc } = await supabase.from('incidents').select('*').eq('incident_id', id).maybeSingle();
      addNode(id, `Incident: ${id}\n${inc?.title || 'System Anomaly'}`, '#ef4444', 300, 150);

      const { data: excs } = await supabase.from('exceptions').select('*').eq('incident_id', id);
      (excs || []).forEach((e, idx) => {
        addNode(e.exception_id, `Exception: ${e.type}`, '#f59e0b', 100 + idx * 220, 300);
        addEdge(id, e.exception_id, 'contains_exception', '#ef4444');
      });

    } else {
      addNode(id, `${type.toUpperCase()}: ${id}`, '#64748b', 250, 150);
    }

    res.json({ nodes, edges });
  } catch (error) {
    console.error('Graph API error:', error);
    res.status(500).json({ error: error.message || 'Graph build failed' });
  }
}
