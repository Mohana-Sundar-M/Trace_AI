import { SupabaseClient } from '@supabase/supabase-js';

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string };
  style?: any;
  type?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: any;
}

export interface FinancialGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class GraphBuilder {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generates a deterministic graph of financial relationships starting from a settlement.
   */
  async buildSettlementGraph(settlementId: string): Promise<FinancialGraph> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // 1. Fetch Settlement
    const { data: setl } = await this.supabase
      .from('settlements')
      .select('*')
      .eq('settlement_id', settlementId)
      .single();

    if (!setl) throw new Error('Settlement not found');

    nodes.push({
      id: setl.settlement_id,
      position: { x: 150, y: 250 },
      data: { label: `Settlement ${setl.settlement_id}\n₹${(setl.amount / 100).toLocaleString('en-IN')}` },
      style: { background: '#151B23', color: '#fff', border: '1px solid #3b82f6' }
    });

    // 2. Fetch Settlement Items
    const { data: items } = await this.supabase
      .from('settlement_items')
      .select('*')
      .eq('settlement_id', settlementId);

    let currentY = 50;

    for (const item of (items || [])) {
      if (item.payment_id) {
        nodes.push({
          id: item.payment_id,
          position: { x: -100, y: currentY },
          data: { label: `Payment ${item.payment_id}\n₹${(item.gross_amount / 100).toLocaleString('en-IN')}` },
          style: { background: '#11161D', color: '#fff', border: '1px solid #2e303a' }
        });
        edges.push({
          id: `e_${item.payment_id}_${setl.settlement_id}`,
          source: item.payment_id,
          target: setl.settlement_id,
          animated: true,
          style: { stroke: '#9ca3af' }
        });
        currentY += 100;
      }
      
      if (item.refund_id) {
        nodes.push({
          id: item.refund_id,
          position: { x: 50, y: currentY },
          data: { label: `Refund ${item.refund_id}\n₹${(item.gross_amount / 100).toLocaleString('en-IN')}` },
          style: { background: '#11161D', color: '#fff', border: '1px solid #f59e0b' }
        });
        edges.push({
          id: `e_${item.refund_id}_${setl.settlement_id}`,
          source: item.refund_id,
          target: setl.settlement_id,
          animated: true,
          style: { stroke: '#f59e0b' }
        });
        currentY += 100;
      }

      if (item.adjustment_id) {
        nodes.push({
          id: item.adjustment_id,
          position: { x: 250, y: currentY - 100 },
          data: { label: `Adjustment ${item.adjustment_id}` },
          style: { background: '#11161D', color: '#fff', border: '1px solid #14b8a6' }
        });
        edges.push({
          id: `e_${item.adjustment_id}_${setl.settlement_id}`,
          source: item.adjustment_id,
          target: setl.settlement_id,
          animated: true,
          style: { stroke: '#14b8a6' }
        });
      }
    }

    // 3. Add UTR & Bank Transaction if matched
    if (setl.utr) {
      nodes.push({
        id: setl.utr,
        position: { x: 150, y: 350 },
        data: { label: `UTR\n${setl.utr}` },
        style: { background: '#11161D', color: '#fff', border: '1px solid #2e303a' }
      });
      edges.push({
        id: `e_${setl.settlement_id}_${setl.utr}`,
        source: setl.settlement_id,
        target: setl.utr,
        animated: true,
        style: { stroke: '#3b82f6' }
      });

      const { data: bankTxn } = await this.supabase
        .from('bank_transactions')
        .select('*')
        .eq('utr', setl.utr)
        .single();
        
      if (bankTxn) {
        nodes.push({
          id: bankTxn.bank_transaction_id,
          position: { x: 150, y: 450 },
          data: { label: `Bank Txn\n₹${(bankTxn.credit / 100).toLocaleString('en-IN')}` },
          style: { background: '#11161D', color: '#fff', border: '1px solid #10b981' }
        });
        edges.push({
          id: `e_${setl.utr}_${bankTxn.bank_transaction_id}`,
          source: setl.utr,
          target: bankTxn.bank_transaction_id,
          animated: true,
          style: { stroke: '#10b981' }
        });
      }
    }

    return { nodes, edges };
  }
}
