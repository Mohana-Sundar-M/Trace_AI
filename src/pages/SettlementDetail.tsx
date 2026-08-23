import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, CheckCircle2, AlertTriangle, FileText, Search, Activity } from 'lucide-react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { InvestigationService } from '../../engine/investigation/service';
import { calculateSettlement } from '../../engine/financial/settlement';
import { EvidenceEngine } from '../../engine/investigation/evidence';

// Example Money Graph Data
const initialNodes: Node[] = [
  { id: 'payment', position: { x: 50, y: 50 }, data: { label: 'Payment ₹12,84,500' }, type: 'default', style: { background: '#11161D', color: '#fff', border: '1px solid #2e303a' } },
  { id: 'refund', position: { x: 50, y: 150 }, data: { label: 'Refund ₹15,000' }, style: { background: '#11161D', color: '#fff', border: '1px solid #f59e0b' } },
  { id: 'adjustment', position: { x: 250, y: 150 }, data: { label: 'Adjustment ₹32,000' }, style: { background: '#11161D', color: '#fff', border: '1px solid #14b8a6' } },
  { id: 'settlement', position: { x: 150, y: 250 }, data: { label: 'Settlement SETL_8291' }, style: { background: '#151B23', color: '#fff', border: '1px solid #3b82f6' } },
  { id: 'utr', position: { x: 150, y: 350 }, data: { label: 'UTR AXISCN1153863727' }, style: { background: '#11161D', color: '#fff', border: '1px solid #2e303a' } },
  { id: 'bank', position: { x: 150, y: 450 }, data: { label: 'Bank Txn ₹11,88,650' }, style: { background: '#11161D', color: '#fff', border: '1px solid #10b981' } },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'payment', target: 'settlement', animated: true, style: { stroke: '#9ca3af' } },
  { id: 'e2', source: 'refund', target: 'settlement', animated: true, style: { stroke: '#f59e0b' } },
  { id: 'e3', source: 'adjustment', target: 'settlement', animated: true, style: { stroke: '#14b8a6' } },
  { id: 'e4', source: 'settlement', target: 'utr', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e5', source: 'utr', target: 'bank', animated: true, style: { stroke: '#10b981' } },
];

export default function SettlementDetail() {
  const { id } = useParams();
  const location = useLocation();
  const aiQuery = location.state?.aiQuery || `Investigate settlement ${id}`;
  const [investigating, setInvestigating] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<any>(null);

  const steps = [
    'Planning investigation...',
    'Retrieving financial records...',
    'Tracing relationships...',
    'Analyzing settlement variance...',
    'Verifying evidence...',
    'Generating root cause...'
  ];

  const handleInvestigate = async () => {
    if (!id) return;
    setInvestigating(true);
    setStep(0);
    setResult(null);

    // Simulate stepping through stages for UI effect
    const interval = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 800);

    try {
      // Call the AI Agent API
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: aiQuery,
          settlementId: id,
          merchantId: 'TEST_MERCHANT'
        })
      });

      if (!res.ok) {
        throw new Error(`API Error: ${await res.text()}`);
      }

      const data = await res.json();

      // Transform backend response to match UI state expectations
      const mappedResult = {
        investigationId: data.investigationId,
        status: data.status,
        rootCause: data.summary,
        explainedAmount: data.explainedAmount,
        unexplainedAmount: data.unexplainedAmount,
        confidence: data.confidence,
        evidenceIds: data.rootCauses?.map((c: any) => c.type) || [], // Placeholder for UI
        findings: data.rootCauses?.map((c: any) => ({ message: c.explanation })) || [],
        recommendedAction: data.recommendedAction
      };

      clearInterval(interval);
      setStep(steps.length);
      setResult(mappedResult);
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setStep(steps.length);
      setResult({
        status: "failed",
        rootCause: `Backend Error: ${err.message}`,
        explainedAmount: 0,
        unexplainedAmount: 0,
        confidence: 0,
        evidenceIds: [],
        findings: [
          "Failed to connect to the investigation edge function. Please ensure the backend is running."
        ],
        recommendedAction: "retry"
      });
    } finally {
      setInvestigating(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/settlements" className="p-2 hover:bg-white/5 rounded-full text-text-secondary hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{id}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning uppercase tracking-wider border border-warning/20">Variance</span>
            </div>
            <p className="text-sm text-text-secondary">Expected: ₹12,36,500 • Actual: ₹11,88,650 • Variance: <span className="text-warning font-semibold">₹47,850</span></p>
          </div>
        </div>
        
        {!result && !investigating && (
          <button onClick={handleInvestigate} className="btn-primary flex items-center gap-2">
            <BrainCircuit size={18} />
            Investigate with TRACE
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT COLUMN: Investigation Workspace */}
        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2">
          
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search size={16} /> Investigation Status
            </h2>
            
            <div className="mb-6">
              <p className="text-white font-medium mb-1">Question:</p>
              <div className="bg-brand-primary p-3 rounded-md border border-white/5 text-sm italic text-text-secondary">
                "Why is {id} short by {id === 'SETL_8291' ? '₹47,850' : '₹50,000'}?"
              </div>
            </div>

            {investigating && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-accent-teal mb-4">
                  <Activity className="animate-pulse" size={20} />
                  <span className="font-medium">{steps[step]}</span>
                </div>
                
                <div className="space-y-2 pl-4 border-l-2 border-white/10">
                  {steps.map((s, i) => (
                    <div key={i} className={clsx(
                      "text-sm transition-all duration-300",
                      i < step ? "text-success flex items-center gap-2" : i === step ? "text-white font-medium" : "text-white/20"
                    )}>
                      {i < step && <CheckCircle2 size={14} />}
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                
                <div className={clsx(
                  "p-4 rounded-lg border",
                  result.status === 'resolved' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.status === 'resolved' ? (
                      <CheckCircle2 className="text-success" size={20} />
                    ) : (
                      <AlertTriangle className="text-warning" size={20} />
                    )}
                    <h3 className={clsx("font-semibold", result.status === 'resolved' ? "text-success" : "text-warning")}>
                      {result.status === 'resolved' ? 'ROOT CAUSE FOUND' : 'HUMAN REVIEW REQUIRED'}
                    </h3>
                  </div>
                  
                  <div className="whitespace-pre-wrap text-sm text-white font-mono mt-4">
                    {result.rootCause}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-primary border border-white/5 p-4 rounded-lg">
                    <p className="text-xs text-text-secondary mb-1">Confidence</p>
                    <p className="text-2xl font-semibold text-white">{result.confidence}%</p>
                  </div>
                  <div className="bg-brand-primary border border-white/5 p-4 rounded-lg">
                    <p className="text-xs text-text-secondary mb-1">Evidence</p>
                    <p className="text-2xl font-semibold text-white">{result.evidenceIds.length > 0 ? '100%' : '0%'}</p>
                  </div>
                </div>

                {result.evidenceIds.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Verified Evidence</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.evidenceIds.map((eid: string) => (
                        <div key={eid} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-primary border border-white/10 rounded text-xs font-mono text-text-secondary hover:text-white hover:border-white/30 cursor-pointer transition-colors">
                          <FileText size={12} />
                          {eid}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.status === 'resolved' ? (
                  <button className="w-full btn-primary bg-success hover:bg-success/90 text-brand-primary font-bold">
                    Mark Reconciled
                  </button>
                ) : (
                  <button className="w-full btn-primary bg-warning hover:bg-warning/90 text-brand-primary font-bold">
                    Escalate for Review
                  </button>
                )}
              </div>
            )}
            
            {!investigating && !result && (
              <div className="text-center py-12">
                <BrainCircuit className="mx-auto text-white/10 mb-4" size={48} />
                <p className="text-text-secondary text-sm">Click "Investigate with TRACE" to begin AI root-cause analysis.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Money Graph */}
        <div className="lg:col-span-7 glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-brand-surface/50 flex justify-between items-center shrink-0">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Money Graph</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-teal"></span> Adjustment</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning"></span> Refund</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success"></span> Bank</span>
            </div>
          </div>
          <div className="flex-1 w-full bg-brand-primary relative">
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
        
      </div>
    </div>
  );
}
