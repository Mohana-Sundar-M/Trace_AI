import { evaluateAllAnomalies } from './anomaly/detectors.js';
import { correlateAnomalies } from './correlation/index.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runDemo() {
  console.log('==================================================');
  console.log('TRACE DEMO MODE');
  console.log('==================================================');
  console.log('Preparing deterministic scenarios A, B, C, D, E...');

  // This relies on the benchmark seed having run first to populate the DB.
  
  const merchantId = 'TEST_MERCHANT';

  // Trigger evaluation for SETL_8291
  console.log('-> Simulating detection for SETL_8291...');
  await evaluateAllAnomalies(supabase, merchantId, 'SETL_8291');

  // Trigger evaluation for SETL_0091
  console.log('-> Simulating detection for SETL_0091...');
  await evaluateAllAnomalies(supabase, merchantId, 'SETL_0091');

  // Trigger correlation
  console.log('-> Running correlation engine...');
  await correlateAnomalies(supabase, merchantId);

  console.log('Demo Mode successfully generated open exceptions and incidents in the database.');
  console.log('The UI will now display these incidents in real-time.');
}

runDemo().catch(console.error);
