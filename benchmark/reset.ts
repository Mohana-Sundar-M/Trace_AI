import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// @ts-ignore
globalThis.WebSocket = WebSocket;

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { WebSocket: WebSocket }
});

async function run() {
  console.log("Wiping trace database...");

  // Must delete in reverse dependency order
  const tables = [
    'exceptions',
    'incidents',
    'refunds',
    'webhook_events',
    'settlement_items',
    'settlements',
    'payments',
    'orders'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('merchant_id', 'NON_EXISTENT');
    if (error) {
      console.error(`Failed to wipe ${table}:`, error);
    } else {
      console.log(`Wiped ${table}`);
    }
  }

  console.log("Reset complete!");
}

run();
