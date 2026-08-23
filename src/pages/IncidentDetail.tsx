import { ArrowLeft, Clock, Activity, Target, MessageSquare, Check } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [
  { id: 'webhook', position: { x: 50, y: 50 }, data: { label: 'Webhook Failure Spike' }, type: 'default', style: { background: '#11161D', color: '#fff', border: '1px solid #ef4444' } },
  { id: 'payment', position: { x: 50, y: 150 }, data: { label: 'Payment Degradation' }, style: { background: '#11161D', color: '#fff', border: '1px solid #f59e0b' } },
  { id: 'settlement', position: { x: 50, y: 250 }, data: { label: 'Settlement Variance' }, style: { background: '#151B23', color: '#fff', border: '1px solid #3b82f6' } },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'webhook', target: 'payment', animated: true, style: { stroke: '#ef4444' } },
  { id: 'e2', source: 'payment', target: 'settlement', animated: true, style: { stroke: '#f59e0b' } },
];

export default function IncidentDetail() {
  const { id } = useParams();
  const [actionStatus, setActionStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none pb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/exceptions" className="text-text-secondary hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Incident {id}</h1>
            <span className="bg-critical/10 text-critical text-xs font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
              CRITICAL
            </span>
            <span className="bg-accent-blue/10 text-accent-blue text-xs font-medium px-2 py-0.5 rounded-sm">
              AI RECOMMENDED
            </span>
          </div>
        </div>
        <p className="text-text-secondary">Cascading Webhook Failures impacting operations and triggering settlement variance.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel rounded-xl p-6 flex-1 min-h-[400px]">
             <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
               <Target size={16} className="text-text-secondary" />
               Causal Graph (Money Graph)
             </h2>
             <div className="w-full h-full relative overflow-hidden bg-brand-primary rounded-lg">
               <ReactFlow 
                 nodes={initialNodes} 
                 edges={initialEdges}
                 fitView
                 className="dark"
               >
                 <Background color="#2e303a" gap={16} />
                 <Controls className="!bg-brand-surface !border-white/10 !fill-white" />
               </ReactFlow>
             </div>
          </div>
          
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-accent-blue" />
              AI Investigation Report
            </h2>
            <div className="text-sm text-text-secondary space-y-4">
               <p><strong>Root Cause:</strong> Repeated failures in Webhook delivery triggered a timeout on 45 payments. As a result, the settlement SETL_0091 reported a variance of ₹47,850.</p>
               <p><strong>Recommendation:</strong> Pause payouts for affected merchant accounts, resync webhook payloads, and retry missing captures.</p>
               {actionStatus === 'pending' && (
                 <div className="flex gap-3 mt-4">
                   <button onClick={() => setActionStatus('approved')} className="btn-primary text-xs bg-success hover:bg-success/90 text-brand-primary font-bold">Approve Action</button>
                   <button onClick={() => setActionStatus('rejected')} className="btn-secondary text-xs">Reject</button>
                 </div>
               )}
               {actionStatus === 'approved' && (
                 <div className="flex items-center gap-2 mt-4 text-success font-medium text-xs bg-success/10 border border-success/20 px-3 py-2 rounded-md">
                   <Check size={14} /> Action Approved and Processing
                 </div>
               )}
               {actionStatus === 'rejected' && (
                 <div className="flex items-center gap-2 mt-4 text-text-secondary font-medium text-xs bg-white/5 border border-white/10 px-3 py-2 rounded-md">
                   Action Rejected
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
            <Clock size={16} className="text-text-secondary" />
            Incident Timeline
          </h2>
          
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              <TimelineItem time="10:45 AM" title="Webhook Failure Spike" desc="Anomaly detected: 45 consecutive hook failures." isFirst={true} />
              <TimelineItem time="11:00 AM" title="Payment Degradation" desc="Success rate dropped by 1.2%." />
              <TimelineItem time="11:30 AM" title="Settlement Variance" desc="Expected ₹2.84 Cr, actual ₹2.83 Cr." />
              <TimelineItem time="11:31 AM" title="Incident Correlated" desc="AI grouped anomalies into INC_001." isLast={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ time, title, desc, isFirst, isLast }: any) {
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      <div className={`flex items-center justify-center w-5 h-5 rounded-full border border-white bg-brand-surface shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-none ${isFirst ? 'border-critical' : isLast ? 'border-accent-blue' : 'border-white/20'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isFirst ? 'bg-critical' : isLast ? 'bg-accent-blue' : 'bg-white/50'}`}></div>
      </div>
      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded bg-white/5 border border-white/5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-white">{title}</span>
          <span className="text-xs text-text-secondary font-mono">{time}</span>
        </div>
        <p className="text-xs text-text-secondary">{desc}</p>
      </div>
    </div>
  );
}
