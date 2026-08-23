import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deterministic random number generator
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number) {
    return Math.floor(this.next() * (max - min)) + min;
  }
  choice<T>(arr: T[]): T {
    return arr[this.range(0, arr.length)];
  }
}

const rng = new SeededRandom(12345);

export function generateSyntheticData() {
  const merchant = {
    merchant_id: 'acc_TR_MRC_001',
    business_name: 'NovaCart Technologies',
    currency: 'INR',
    mode: 'test',
    settlement_cycle: 'T+2',
    created_at: new Date('2026-01-01T10:00:00Z').toISOString()
  };

  const customers = [];
  for (let i = 1; i <= 1000; i++) {
    customers.push({
      customer_id: `cust_${10000 + i}`,
      merchant_id: merchant.merchant_id,
      name: `Customer ${i}`,
      email: `customer${i}@example.com`,
      created_at: new Date(Date.now() - rng.range(1000000, 10000000000)).toISOString()
    });
  }

  const orders = [];
  const payments = [];
  const refunds = [];
  const disputes = [];

  // Generate 1500 orders
  for (let i = 1; i <= 1500; i++) {
    const customer = rng.choice(customers);
    const amount = rng.range(50000, 5000000); // 500 INR to 50000 INR (in paise)
    
    const order = {
      order_id: `order_${20000 + i}`,
      merchant_id: merchant.merchant_id,
      customer_id: customer.customer_id,
      amount,
      currency: 'INR',
      status: 'paid',
      attempts: 1,
      created_at: new Date(Date.now() - rng.range(100000, 5000000000)).toISOString()
    };
    orders.push(order);

    // 1300 payments (some orders might not be paid)
    if (i <= 1300) {
      const payment = {
        payment_id: `pay_TRX${30000 + i}`,
        order_id: order.order_id,
        merchant_id: merchant.merchant_id,
        customer_id: customer.customer_id,
        amount,
        currency: 'INR',
        status: 'captured',
        method: rng.choice(['upi', 'card', 'netbanking']),
        captured: true,
        amount_refunded: 0,
        amount_transferred: 0,
        created_at: new Date(new Date(order.created_at).getTime() + 10000).toISOString()
      };
      payments.push(payment);
    }
  }

  // Generate SETL_8291 success scenario demo case
  const demoSettlement1 = {
    settlement_id: 'SETL_8291',
    merchant_id: merchant.merchant_id,
    amount: 118865000, // ₹11,88,650.00
    fees: 385000, // ₹3,850
    tax: 65000, // ₹650
    utr: 'AXISCN1153863727',
    status: 'processed',
    processed_at: new Date().toISOString()
  };

  // Generate SETL_0091 failure scenario demo case
  const demoSettlement2 = {
    settlement_id: 'SETL_0091',
    merchant_id: merchant.merchant_id,
    amount: 45000000, // ₹4,50,000 (Expected 5,00,000, missing 50,000)
    fees: 150000,
    tax: 27000,
    utr: 'AXISCN1153863728',
    status: 'processed',
    processed_at: new Date().toISOString()
  };

  // Write all to JSON
  const outputDir = path.join(__dirname, '../supabase/seed');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'data.json'), JSON.stringify({
    merchants: [merchant],
    customers,
    orders,
    payments,
    refunds,
    disputes,
    settlements: [demoSettlement1, demoSettlement2]
  }, null, 2));

  console.log('Synthetic dataset generated successfully at supabase/seed/data.json');
}

generateSyntheticData();
