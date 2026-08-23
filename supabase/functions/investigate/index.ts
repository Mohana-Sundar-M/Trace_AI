import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
// In a real Deno deployment, these engine imports would either be bundled or published.
// For this prototype, we're assuming they are accessible or transpiled via a build step.
import { InvestigationService } from '../_shared/engine/investigation/service.ts';
import { calculateSettlement } from '../_shared/engine/financial/settlement.ts';
import { EvidenceEngine } from '../_shared/engine/investigation/evidence.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { question, settlementId, merchantId } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const invService = new InvestigationService(supabase);
    const evidenceEngine = new EvidenceEngine(supabase);

    // 1. Start
    const invId = await invService.startInvestigation(merchantId || 'TEST_MERCHANT', 'settlement', settlementId, question || `Investigate ${settlementId}`);
    
    // 2. Planning & Retrieving
    await invService.transitionState(invId, 'planning');
    await invService.transitionState(invId, 'retrieving');

    // 3. Calculating
    await invService.transitionState(invId, 'calculating');
    const calculation = await calculateSettlement(supabase, settlementId);

    // 4. Matching & Analyzing
    await invService.transitionState(invId, 'matching');
    await invService.transitionState(invId, 'analyzing');

    // 5. Verifying
    await invService.transitionState(invId, 'verifying');
    
    // Build the deterministic response
    const isMatched = calculation.variance === 0;
    
    let rootCause = "";
    const evidenceIds: string[] = [];
    const findings: { message: string }[] = [];
    
    if (isMatched) {
      rootCause = `Settlement exactly matches expected amount of ₹${calculation.expectedAmount / 100}.`;
      await evidenceEngine.recordFinding(invId, rootCause, 100, [{ type: 'settlement', id: settlementId }]);
      findings.push({ message: rootCause });
      evidenceIds.push(settlementId);
    } else {
      // It's a variance. Let's look at the components to explain it.
      let explained = 0;
      if (calculation.adjustments !== 0) {
        explained += calculation.adjustments;
        findings.push({ message: `Adjustment found for ₹${Math.abs(calculation.adjustments) / 100}` });
      }
      if (calculation.refunds !== 0) {
        explained += calculation.refunds; // assuming refunds are positive in our formula context
        findings.push({ message: `Refunds found for ₹${Math.abs(calculation.refunds) / 100}` });
      }
      if (calculation.fees !== 0) {
        explained += calculation.fees;
        findings.push({ message: `Fees found for ₹${Math.abs(calculation.fees) / 100}` });
      }

      // If the explained components perfectly match the variance (which happens if the DB is seeded that way)
      if (Math.abs(explained) === Math.abs(calculation.variance)) {
        rootCause = `₹${Math.abs(calculation.variance) / 100} explained by components.`;
        await evidenceEngine.recordFinding(invId, rootCause, 95, [{ type: 'settlement', id: settlementId }]);
      } else {
        rootCause = `UNRESOLVED VARIANCE. Expected ₹${calculation.expectedAmount / 100}, actual ₹${calculation.actualAmount / 100}. Cannot deterministically match pending events.`;
        await evidenceEngine.recordFinding(invId, rootCause, 60, [{ type: 'settlement', id: settlementId }]);
      }
    }

    const status = isMatched ? 'resolved' : (Math.abs(calculation.variance) <= 500000 ? 'resolved' : 'human_review'); // Example thresholds
    const confidence = isMatched ? 100 : (status === 'resolved' ? 95 : 60);

    const result = {
      investigationId: invId,
      status,
      rootCause,
      explainedAmount: Math.abs(calculation.variance),
      unexplainedAmount: status === 'human_review' ? Math.abs(calculation.variance) : 0,
      confidence,
      evidenceIds,
      findings,
      recommendedAction: status === 'resolved' ? 'mark_reconciled' : 'human_review'
    };

    // 6. Conclude
    await invService.concludeInvestigation(invId, result as any);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
