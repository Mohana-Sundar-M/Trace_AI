import fs from 'fs';

const merchantId = 'M_1001';
const customerId = 'CUS_999';

const gId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

let sql = `-- TRACE Large Mock Dataset\n`;
sql += `SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\n\n`;

const orders: string[] = [];
const payments: string[] = [];
const settlements: string[] = [];
const settlementItems: string[] = [];
const webhooks: string[] = [];
const refunds: string[] = [];
const incidents: string[] = [];
const exceptions: string[] = [];
const disputes: string[] = [];

function escape(str: string) {
  return `'${str.replace(/'/g, "''")}'`;
}

console.log("Building SQL...");

for (let s = 0; s < 10; s++) {
  const setlId = gId('SETL');
  let totalSettlementAmount = 0;

  for (let p = 0; p < 15; p++) {
    const amount = Math.floor(Math.random() * 50000) + 1000;
    totalSettlementAmount += amount;
    
    const orderId = gId('ORD');
    const paymentId = gId('PAY');
    
    orders.push(`(${escape(orderId)}, ${escape(merchantId)}, ${escape(customerId)}, ${amount}, 'paid')`);
    payments.push(`(${escape(paymentId)}, ${escape(orderId)}, ${escape(merchantId)}, ${escape(customerId)}, ${amount}, 'captured', 'upi')`);
    
    settlementItems.push(`(${escape(gId('SITM'))}, ${escape(setlId)}, ${escape(paymentId)}, ${amount}, ${amount})`);
    
    webhooks.push(`(${escape(gId('EVT'))}, ${escape(merchantId)}, 'payment.captured', 'payment', ${escape(paymentId)}, '{"amount": ${amount}}', 'processed')`);

    if (Math.random() > 0.8) {
      refunds.push(`(${escape(gId('REF'))}, ${escape(merchantId)}, ${escape(paymentId)}, ${amount}, 'processed', 'optimum')`);
    }

    if (Math.random() > 0.9) {
      disputes.push(`(${escape(gId('DSP'))}, ${escape(merchantId)}, ${escape(paymentId)}, 'CHARGEBACK', ${amount}, 'under_review')`);
    }
  }

  const isVariance = Math.random() > 0.6;
  const finalSetlAmount = isVariance ? totalSettlementAmount - 5000 : totalSettlementAmount;
  
  settlements.push(`(${escape(setlId)}, ${escape(merchantId)}, ${finalSetlAmount}, 'processed', ${escape(gId('UTR'))})`);
  
  if (isVariance) {
    const excId = gId('EXC');
    const incId = gId('INC');
    incidents.push(`(${escape(incId)}, ${escape(merchantId)}, 'HIGH', 'Settlement Amount Mismatch', 5000, 'DETECTED')`);
    exceptions.push(`(${escape(excId)}, ${escape(merchantId)}, 'HIGH', 'Settlement Variance Detected', 5000, 'settlement', ${escape(setlId)}, 'DETECTED', ${escape(incId)})`);
  }
}

// Add webhook failures
const incId = gId('INC');
incidents.push(`(${escape(incId)}, ${escape(merchantId)}, 'CRITICAL', 'Cascading Webhook Failures', 50000, 'DETECTED')`);
for (let w = 0; w < 5; w++) {
  const pId = gId('PAY');
  const oId = gId('ORD');
  orders.push(`(${escape(oId)}, ${escape(merchantId)}, ${escape(customerId)}, 10000, 'paid')`);
  payments.push(`(${escape(pId)}, ${escape(oId)}, ${escape(merchantId)}, ${escape(customerId)}, 10000, 'captured', 'card')`);
  webhooks.push(`(${escape(gId('EVT'))}, ${escape(merchantId)}, 'payment.captured', 'payment', ${escape(pId)}, '{"amount": 10000}', 'failed')`);
  exceptions.push(`(${escape(gId('EXC'))}, ${escape(merchantId)}, 'HIGH', 'Webhook Delivery Failed', 10000, 'payment', ${escape(pId)}, 'DETECTED', ${escape(incId)})`);
}

// Write to SQL
if (orders.length > 0) sql += `INSERT INTO orders (order_id, merchant_id, customer_id, amount, status) VALUES\n${orders.join(',\n')};\n\n`;
if (payments.length > 0) sql += `INSERT INTO payments (payment_id, order_id, merchant_id, customer_id, amount, status, method) VALUES\n${payments.join(',\n')};\n\n`;
if (settlements.length > 0) sql += `INSERT INTO settlements (settlement_id, merchant_id, amount, status, utr) VALUES\n${settlements.join(',\n')};\n\n`;
if (settlementItems.length > 0) sql += `INSERT INTO settlement_items (settlement_item_id, settlement_id, payment_id, gross_amount, net_amount) VALUES\n${settlementItems.join(',\n')};\n\n`;
if (webhooks.length > 0) sql += `INSERT INTO webhook_events (event_id, merchant_id, event_type, entity_type, entity_id, payload, status) VALUES\n${webhooks.join(',\n')};\n\n`;
if (refunds.length > 0) sql += `INSERT INTO refunds (refund_id, merchant_id, payment_id, amount, status, speed_processed) VALUES\n${refunds.join(',\n')};\n\n`;
if (disputes.length > 0) sql += `INSERT INTO disputes (dispute_id, merchant_id, payment_id, reason, amount, status) VALUES\n${disputes.join(',\n')};\n\n`;
if (incidents.length > 0) sql += `INSERT INTO incidents (incident_id, merchant_id, severity, title, potential_loss, status) VALUES\n${incidents.join(',\n')};\n\n`;
if (exceptions.length > 0) sql += `INSERT INTO exceptions (exception_id, merchant_id, severity, type, amount, entity_type, entity_id, status, incident_id) VALUES\n${exceptions.join(',\n')};\n\n`;

sql += `INSERT INTO merchant_health (merchant_id, health_score, status, payment_success_rate, refund_rate, dispute_rate, settlement_variance, webhook_reliability, unresolved_exposure) VALUES\n`;
sql += `('M_1001', 98.5, 'Healthy', 99.2, 1.5, 0.2, 5000, 99.9, 10000) ON CONFLICT (merchant_id) DO UPDATE SET payment_success_rate = 99.2, settlement_variance = 5000;\n\n`;

fs.writeFileSync('mock_large_data.sql', sql);
console.log("SQL file generated: mock_large_data.sql");
