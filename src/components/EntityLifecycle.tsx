// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, ShieldAlert, AlertTriangle, ArrowRight, Activity, ServerCrash, Loader2, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

type EntityNode = {
  id: string;
  type: string;
  status: 'ok' | 'warning' | 'error' | 'investigating';
  label: string;
  route: string;
};

export default function EntityLifecycle({ startType, startId }: { startType: string, startId: string }) {
  const [nodes, setNodes] = useState<EntityNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChain = async () => {
      setLoading(true);
      try {
        let chain: EntityNode[] = [];
        
        // Example tracing logic starting from Settlement, Exception, or Incident
        // Real implementation would deeply query relationships
        
        // This is a simplified deterministic graph builder
        let rootPaymentId = null;
        let settlementId = null;
        let exceptionId = null;
        let incidentId = null;

        if (startType === 'incident') {
          incidentId = startId;
          const { data: inc } = await supabase.from('incidents').select('*').eq('incident_id', startId).single();
          if (inc && inc.exception_ids && inc.exception_ids.length > 0) {
            exceptionId = inc.exception_ids[0];
          }
        }
        
        if (startType === 'exception' || exceptionId) {
          const targetId = exceptionId || startId;
          const { data: exc } = await supabase.from('exceptions').select('*').eq('exception_id', targetId).single();
          if (exc) {
            exceptionId = exc.exception_id;
            if (exc.entity_type === 'settlement') settlementId = exc.entity_id;
            if (exc.entity_type === 'payment') rootPaymentId = exc.entity_id;
            if (exc.incident_id) incidentId = exc.incident_id;
          }
        }

        if (startType === 'settlement' || settlementId) {
          const targetId = settlementId || startId;
          settlementId = targetId;
          // In TRACE mock data, we can just grab one payment related to the settlement
          const { data: pay } = await supabase.from('payments').select('payment_id').eq('settlement_id', targetId).limit(1).single();
          if (pay) rootPaymentId = pay.payment_id;
        }

        if (startType === 'payment') {
          rootPaymentId = startId;
        }

        // Now build forward from rootPaymentId or settlementId
        if (rootPaymentId) {
          chain.push({ id: 'ORD_X', type: 'order', status: 'ok', label: 'ORDER', route: '#' });
          chain.push({ id: rootPaymentId, type: 'payment', status: 'ok', label: 'PAYMENT', route: `/payments` });
          
          const { data: setl } = await supabase.from('payments').select('settlement_id').eq('payment_id', rootPaymentId).single();
          if (setl?.settlement_id) {
            settlementId = setl.settlement_id;
          }
        }

        if (settlementId) {
          chain.push({ id: settlementId, type: 'settlement', status: 'ok', label: 'SETTLEMENT', route: `/settlements` });
          chain.push({ id: `BANK_${settlementId}`, type: 'bank', status: 'ok', label: 'BANK TXN', route: '#' });
          chain.push({ id: `RECON_${settlementId}`, type: 'reconciliation', status: exceptionId ? 'warning' : 'ok', label: 'RECONCILIATION', route: `/reconciliation` });
        }

        if (exceptionId) {
          chain.push({ id: exceptionId, type: 'exception', status: 'error', label: 'EXCEPTION', route: `/exceptions` });
          
          const { data: inv } = await supabase.from('investigations').select('investigation_id, status').eq('target_id', exceptionId).maybeSingle();
          if (inv) {
            chain.push({ id: inv.investigation_id, type: 'investigation', status: inv.status === 'COMPLETED' ? 'ok' : 'investigating', label: 'INVESTIGATION', route: `/investigations/exception/${exceptionId}` });
          } else {
             chain.push({ id: `INV_${exceptionId}`, type: 'investigation', status: 'investigating', label: 'INVESTIGATION', route: `/investigations/exception/${exceptionId}` });
          }
        }

        if (incidentId) {
          if (!chain.find(n => n.type === 'exception')) {
             chain.push({ id: incidentId, type: 'incident', status: 'error', label: 'INCIDENT', route: `/incidents` });
          }
        }

        // Dedup and set
        const unique = chain.filter((v, i, a) => a.findIndex(t => (t.type === v.type)) === i);
        setNodes(unique.length > 0 ? unique : [
          { id: startId, type: startType, status: 'ok', label: startType.toUpperCase(), route: '#' }
        ]);

      } catch (err) {
        console.error("Failed to build lifecycle", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChain();
  }, [startType, startId]);

  if (loading) return <div className="h-16 flex items-center justify-center text-text-secondary"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="w-full overflow-x-auto py-6 hide-scrollbar">
      <div className="flex items-center min-w-max px-4">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <Link to={node.route} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all bg-brand-surface
                ${node.status === 'ok' ? 'border-success text-success group-hover:bg-success/10' : 
                  node.status === 'error' ? 'border-critical text-critical group-hover:bg-critical/10' : 
                  node.status === 'warning' ? 'border-warning text-warning group-hover:bg-warning/10' : 
                  'border-accent-blue text-accent-blue group-hover:bg-accent-blue/10'}`}
              >
                {node.status === 'ok' ? <CheckCircle2 size={18} /> :
                 node.status === 'error' ? <ServerCrash size={18} /> :
                 node.status === 'warning' ? <AlertTriangle size={18} /> :
                 <Activity size={18} />}
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-text-secondary group-hover:text-white transition-colors">
                {node.label}
              </span>
            </Link>
            
            {i < nodes.length - 1 && (
              <div className="w-12 flex items-center justify-center text-white/20 mb-6">
                <ArrowRight size={16} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
