// @ts-nocheck
import { SupabaseClient } from '@supabase/supabase-js';

// Correlates open exceptions into incidents
export async function correlateAnomalies(supabase: SupabaseClient, merchantId: string) {
  // 1. Fetch all OPEN exceptions without an incident_id
  const { data: openAnomalies } = await supabase
    .from('exceptions')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'open')
    .is('incident_id', null);

  if (!openAnomalies || openAnomalies.length === 0) return;

  // 2. Fetch all recent OPEN incidents for this merchant
  const { data: openIncidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'OPEN');

  // Simple Temporal & Causal grouping
  // If we have a webhook failure and a settlement variance, they likely correlate.
  // If we have a refund spike and settlement variance, they likely correlate.
  // If we have payment degradation and webhook failure, they likely correlate.

  for (const anomaly of openAnomalies) {
    let matchedIncidentId = null;

    if (openIncidents && openIncidents.length > 0) {
      // Try to find an incident created in the last 24 hours that matches
      const recentIncident = openIncidents.find(inc => {
        const diffHours = (Date.now() - new Date(inc.detected_at).getTime()) / (1000 * 60 * 60);
        return diffHours < 24; // temporally related
      });

      if (recentIncident) {
        matchedIncidentId = recentIncident.incident_id;
      }
    }

    if (!matchedIncidentId) {
      // Create a new incident
      const newIncidentId = `INC_${merchantId}_${Date.now()}`;
      
      let title = `Anomaly detected: ${anomaly.type}`;
      if (anomaly.type === 'SETTLEMENT_VARIANCE') title = `Settlement Variance on ${anomaly.entity_id}`;
      else if (anomaly.type === 'WEBHOOK_FAILURE_CASCADE') title = `Webhook Failures impacting Operations`;
      else if (anomaly.type === 'REFUND_SPIKE') title = `Sudden Spike in Refunds`;
      
      const newIncident = {
        incident_id: newIncidentId,
        merchant_id: merchantId,
        title: title,
        description: `Automatically created incident grouping anomalies starting with ${anomaly.type}.`,
        severity: anomaly.severity,
        financial_impact: anomaly.amount,
        unexplained_amount: anomaly.amount,
        status: 'OPEN'
      };

      await supabase.from('incidents').insert(newIncident);
      openIncidents?.push(newIncident as any);
      matchedIncidentId = newIncidentId;
    } else {
      // Update existing incident impact and severity if needed
      const incident = openIncidents!.find(i => i.incident_id === matchedIncidentId);
      if (incident) {
        incident.financial_impact = Number(incident.financial_impact) + Number(anomaly.amount);
        incident.unexplained_amount = Number(incident.unexplained_amount) + Number(anomaly.amount);
        
        // Upgrade severity if anomaly is higher
        const levels = ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const currentLvl = levels.indexOf(incident.severity);
        const anomalyLvl = levels.indexOf(anomaly.severity);
        if (anomalyLvl > currentLvl) {
          incident.severity = anomaly.severity;
        }

        await supabase.from('incidents').update({
          financial_impact: incident.financial_impact,
          unexplained_amount: incident.unexplained_amount,
          severity: incident.severity,
          title: `Multiple correlated anomalies detected`
        }).eq('incident_id', matchedIncidentId);
      }
    }

    // Assign anomaly to incident
    await supabase.from('exceptions').update({
      incident_id: matchedIncidentId
    }).eq('exception_id', anomaly.exception_id);
  }
}
