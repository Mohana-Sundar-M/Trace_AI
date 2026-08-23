// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

import WebSocket from 'ws';
// @ts-ignore
globalThis.WebSocket = WebSocket;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { WebSocket: WebSocket }
      }
    );
  }
  return supabaseClient;
}

export class GraphBuilder {
  static async build(type: string, id: string, merchantId: string) {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Helper functions
    const addNode = (nId: string, label: string, colorHex: string, type: string = 'default', x: number = 0, y: number = 0) => {
      if (!nodes.find(n => n.id === nId)) {
        nodes.push({
          id: nId,
          type,
          position: { x, y }, // Note: We should ideally use dagre for auto-layout on frontend, but providing arbitrary coords here for now.
          data: { label },
          style: { background: '#11161D', color: '#fff', border: `1px solid ${colorHex}`, borderRadius: '4px', padding: '10px', fontSize: '12px' }
        });
      }
    };

    const addEdge = (source: string, target: string, colorHex: string) => {
      if (!edges.find(e => e.id === `e-${source}-${target}`)) {
        edges.push({
          id: `e-${source}-${target}`,
          source,
          target,
          animated: true,
          style: { stroke: colorHex }
        });
      }
    };

    try {
      const supabase = getSupabase();
      if (type.toUpperCase() === 'SETTLEMENT') {
        const { data: setl } = await supabase.from('settlements').select('*').eq('settlement_id', id).single();
        if (setl) {
          addNode(id, `Settlement ${id}\n₹${(setl.amount/100).toFixed(2)}`, '#3b82f6', 'default', 250, 250);
          
          if (setl.utr) {
            addNode('utr', `UTR ${setl.utr}`, '#10b981', 'default', 250, 350);
            addEdge(id, 'utr', '#3b82f6');
          }

          // Fetch items
          const { data: items } = await supabase.from('settlement_items').select('*, payments(*), refunds(*)').eq('settlement_id', id);
          if (items) {
            items.forEach((item, index) => {
              const yPos = 50 + (index * 80);
              if (item.payments) {
                const pid = item.payments.payment_id;
                addNode(pid, `Payment\n₹${(item.payments.amount/100).toFixed(2)}`, '#2e303a', 'default', 50, yPos);
                addEdge(pid, id, '#9ca3af');
              } else if (item.refunds) {
                const rid = item.refunds.refund_id;
                addNode(rid, `Refund\n₹${(item.refunds.amount/100).toFixed(2)}`, '#f59e0b', 'default', 50, yPos);
                addEdge(rid, id, '#f59e0b');
              }
            });
          }
          // Fetch Exceptions
          const { data: excs } = await supabase.from('exceptions').select('*').eq('entity_type', 'settlement').eq('entity_id', id);
          if (excs && excs.length > 0) {
            excs.forEach((e, index) => {
              addNode(e.exception_id, `Exception\n${e.type}`, '#ef4444', 'default', 450, 50 + (index * 80));
              addEdge(id, e.exception_id, '#ef4444');
            });
          }
        }
      } else if (type.toUpperCase() === 'INCIDENT') {
        const { data: inc } = await supabase.from('incidents').select('*').eq('incident_id', id).single();
        if (inc) {
          addNode(id, `Incident ${id}`, '#ef4444', 'default', 300, 300);
          
          const { data: ex } = await supabase.from('exceptions').select('*').eq('incident_id', id);
          if (ex) {
            ex.forEach((e, index) => {
              const yPos = 100 + (index * 100);
              const color = e.type.includes('Webhook') ? '#ef4444' : e.type.includes('Variance') ? '#3b82f6' : '#f59e0b';
              addNode(e.exception_id, `${e.type}\n${e.entity_id || ''}`, color, 'default', 50, yPos);
              addEdge(e.exception_id, id, color);
            });
          }
        }
      } else if (type.toUpperCase() === 'PAYMENT') {
        const { data: pay } = await supabase.from('payments').select('*').eq('payment_id', id).single();
        if (pay) {
          addNode(id, `Payment ${id}\n₹${(pay.amount/100).toFixed(2)}`, '#10b981', 'default', 200, 200);
          if (pay.order_id) {
            addNode(pay.order_id, `Order ${pay.order_id}`, '#2e303a', 'default', 200, 50);
            addEdge(pay.order_id, id, '#9ca3af');
          }
          
          const { data: ref } = await supabase.from('refunds').select('*').eq('payment_id', id);
          if (ref && ref.length > 0) {
            ref.forEach(r => {
              addNode(r.refund_id, `Refund ${r.refund_id}`, '#f59e0b', 'default', 350, 300);
              addEdge(id, r.refund_id, '#f59e0b');
            });
          }

          const { data: setlItems } = await supabase.from('settlement_items').select('settlement_id').eq('payment_id', id);
          if (setlItems && setlItems.length > 0) {
            setlItems.forEach(si => {
              addNode(si.settlement_id, `Settlement\n${si.settlement_id}`, '#3b82f6', 'default', 50, 300);
              addEdge(id, si.settlement_id, '#3b82f6');
            });
          }

          const { data: webhooks } = await supabase.from('webhook_events').select('*').eq('entity_id', id);
          if (webhooks && webhooks.length > 0) {
            webhooks.forEach((w, i) => {
              const c = w.status === 'failed' ? '#ef4444' : '#10b981';
              addNode(w.event_id, `Webhook\n${w.status}`, c, 'default', 350, 50 + (i * 80));
              addEdge(id, w.event_id, c);
            });
          }

          const { data: excs } = await supabase.from('exceptions').select('*').eq('entity_type', 'payment').eq('entity_id', id);
          if (excs && excs.length > 0) {
            excs.forEach((e, index) => {
              addNode(e.exception_id, `Exception\n${e.type}`, '#ef4444', 'default', 450, 200 + (index * 80));
              addEdge(id, e.exception_id, '#ef4444');
            });
          }
        }
      } else {
        // Fallback placeholder
        addNode('unknown', `Entity ${type}\n${id}`, '#6b7280');
      }
    } catch(err) {
      console.error('Graph build error:', err);
    }

    return { nodes, edges };
  }
}
