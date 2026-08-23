export type NodeType = 'MERCHANT' | 'CUSTOMER' | 'ORDER' | 'PAYMENT' | 'REFUND' | 'DISPUTE' | 'SETTLEMENT' | 'BANK_TRANSACTION';

export interface GraphNode {
  id: string;
  type: NodeType;
  data: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export class MoneyGraph {
  nodes: Map<string, GraphNode> = new Map();
  edges: GraphEdge[] = [];

  addNode(id: string, type: NodeType, data: any) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, type, data });
    }
  }

  addEdge(source: string, target: string, label: string) {
    this.edges.push({ source, target, label });
  }

  buildFromPayment(payment: any, order?: any, settlement?: any, bankTxn?: any, refunds: any[] = []) {
    this.addNode(payment.payment_id, 'PAYMENT', payment);
    
    if (order) {
      this.addNode(order.order_id, 'ORDER', order);
      this.addEdge(order.order_id, payment.payment_id, 'HAS_PAYMENT');
    }
    
    if (settlement) {
      this.addNode(settlement.settlement_id, 'SETTLEMENT', settlement);
      this.addEdge(payment.payment_id, settlement.settlement_id, 'INCLUDED_IN_SETTLEMENT');
      
      if (bankTxn) {
        this.addNode(bankTxn.bank_transaction_id, 'BANK_TRANSACTION', bankTxn);
        this.addEdge(settlement.settlement_id, bankTxn.bank_transaction_id, 'MATCHES_BANK_TRANSACTION');
      }
    }
    
    for (const refund of refunds) {
      this.addNode(refund.refund_id, 'REFUND', refund);
      this.addEdge(payment.payment_id, refund.refund_id, 'HAS_REFUND');
    }
  }

  getSerializableGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }
}
