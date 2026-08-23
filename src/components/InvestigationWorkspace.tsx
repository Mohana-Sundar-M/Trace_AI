import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ShieldCheck, Play, ArrowLeft, RefreshCcw, CheckCircle2, XCircle, AlertCircle, Cpu, Network, IndianRupee, Database } from 'lucide-react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useInvestigation, useGraph, useWorkflowAction } from '../hooks/useInvestigation';
import { useAuth } from '../contexts/AuthContext';
import EntityLifecycle from './EntityLifecycle';

export default function InvestigationWorkspace() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { role, canInvestigate } = useAuth();
  
  const [aiRequested, setAiRequested] = useState(false);
  const { data: report, isLoading: isInvestigating, refetch: runAI, error: aiError } = useInvestigation(type!, id!);
  const { data: graph, isLoading: isGraphLoading } = useGraph(type!, id!);
  
  const { mutate: doAction, isPending: isActionPending } = useWorkflowAction();

  const handleRunAI = () => {
    setAiRequested(true);
    runAI();
  };

  const handleAction = (action: string) => {
    doAction(
      { action, entityType: type, entityId: id, reason: 'Manual review' },
      {
        onSuccess: () => navigate(`/${type}s`),
        onError: (err) => alert(err.message)
      }
    );
  };

  const isRateLimited = aiError?.message?.includes('Rate Limit') || report?.status === 'AI_UNAVAILABLE';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 border border-white/10 text-text-secondary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="uppercase">{type}</span> 
              <span className="text-text-secondary">/</span> 
              <span className="font-mono text-accent-teal">{id}</span>
            </h1>
            <p className="text-text-secondary">Investigation Workspace</p>
          </div>
        </div>
      </div>

      {/* Section 1: Deterministic What Happened */}
      <section className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-brand-primary/50 flex items-center gap-2">
          <Network className="text-accent-blue" size={18} />
          <h2 className="text-sm font-semibold text-white">1. TRACE Event Graph (What Happened)</h2>
        </div>
        <div className="p-4">
           <EntityLifecycle startType={type || ''} startId={id || ''} />
        </div>
        <div className="h-64 border-t border-white/5 relative bg-[#0a0a0a]">
          {isGraphLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-text-secondary">Loading Relational Graph...</div>
          ) : (
            <ReactFlow 
              nodes={graph?.nodes || []} 
              edges={graph?.edges || []} 
              fitView 
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#2e303a" gap={16} />
              <Controls className="bg-brand-surface border-white/10 fill-white" />
            </ReactFlow>
          )}
        </div>
      </section>

      {/* Grid for Sections 2 and 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 2: Deterministic Financial Impact */}
        <section className="glass-panel rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-brand-primary/50 flex items-center gap-2">
            <IndianRupee className="text-warning" size={18} />
            <h2 className="text-sm font-semibold text-white">2. Financial Impact</h2>
          </div>
          <div className="p-6">
            {!report ? (
               <div className="text-center py-8 text-text-secondary">
                 <p className="text-sm">Financial impact will be calculated when investigation starts.</p>
               </div>
            ) : (
              <div className="space-y-4 font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-text-secondary text-sm">Expected Amount</span>
                  <span className="text-white">₹{((Number(report.deterministic_context?.expected_amount ?? report.expectedAmount ?? report.expected_amount) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-text-secondary text-sm">Actual Amount</span>
                  <span className="text-white">₹{((Number(report.deterministic_context?.actual_amount ?? report.actualAmount ?? report.actual_amount) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-warning text-sm font-bold">Total Variance</span>
                  <span className="text-warning font-bold">₹{((Number(report.deterministic_context?.variance ?? report.varianceAmount ?? report.variance_amount ?? report.variance) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-success text-sm">Explained</span>
                  <span className="text-success">₹{((Number(report.explainedAmount ?? report.explained_amount) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-critical text-sm font-bold">Unexplained</span>
                  <span className="text-critical font-bold text-xl">₹{((Number(report.unexplainedAmount ?? (report.unexplained_amount ?? (Number(report.deterministic_context?.variance || report.variance_amount || 0) - Number(report.explainedAmount || report.explained_amount || 0)))) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Deterministic Evidence */}
        <section className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-brand-primary/50 flex items-center gap-2">
            <Database className="text-accent-teal" size={18} />
            <h2 className="text-sm font-semibold text-white">3. System Evidence Found</h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-80">
            {!report ? (
              <div className="text-center py-8 text-text-secondary">
                 <p className="text-sm">Evidence will be collected when investigation starts.</p>
               </div>
            ) : report.evidence && report.evidence.length > 0 ? (
              <div className="space-y-3">
                {report.evidence.map((ev: any, i: number) => (
                  <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-accent-teal uppercase">{ev.type}</p>
                      <p className="text-sm text-white mt-1">{ev.relationship || ev.detail || ev.id}</p>
                    </div>
                    {ev.amount && (
                       <p className="text-sm font-mono text-white">₹{(ev.amount / 100).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
               <div className="text-center py-8 text-text-secondary">
                 <p className="text-sm">No explaining evidence was found.</p>
               </div>
            )}
          </div>
        </section>

      </div>

      {/* Section 4: AI Investigation Finding */}
      <section className="glass-panel rounded-xl border border-white/10 overflow-hidden relative">
        <div className="p-4 border-b border-white/5 bg-brand-primary/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="text-accent-purple" size={18} />
            <h2 className="text-sm font-semibold text-white">4. AI Investigation Finding</h2>
          </div>
          {!report && !isInvestigating && (
            <button 
              onClick={handleRunAI}
              disabled={!canInvestigate}
              className="btn-primary flex items-center gap-2 text-xs py-1.5 px-4 bg-accent-purple hover:bg-accent-purple/80 text-white border-transparent"
            >
              <Play size={14} />
              Run Investigation
            </button>
          )}
        </div>
        
        <div className="p-6">
          {isInvestigating && (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
              <div className="h-24 bg-white/10 rounded w-full"></div>
            </div>
          )}

          {!isInvestigating && !report && !aiRequested && (
             <div className="text-center py-12">
               <ShieldCheck className="mx-auto text-text-secondary mb-3 opacity-50" size={48} />
               <p className="text-text-secondary">Run the AI Investigation to synthesize findings and get a recommendation.</p>
             </div>
          )}

          {!isInvestigating && isRateLimited && (
             <div className="p-6 bg-warning/10 border border-warning/30 rounded-lg text-center">
               <AlertCircle className="mx-auto text-warning mb-3" size={32} />
               <h3 className="text-lg font-bold text-warning mb-2">AI Unavailable</h3>
               <p className="text-white">The AI provider is currently rate-limited or unavailable.</p>
               <p className="text-sm text-text-secondary mt-2">Please Review Deterministic Evidence Manually using Sections 1, 2, and 3.</p>
             </div>
          )}

          {!isInvestigating && report && !isRateLimited && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-accent-purple/10 border border-accent-purple/30 p-6 rounded-xl">
                <p className="text-white leading-relaxed text-lg">{report.summary}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-text-secondary uppercase tracking-wider">AI Confidence:</span>
                  <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden max-w-xs">
                    <div 
                      className={`h-full ${report.confidence > 80 ? 'bg-success' : report.confidence > 50 ? 'bg-warning' : 'bg-critical'}`} 
                      style={{ width: `${report.confidence}%` }} 
                    />
                  </div>
                  <span className="text-xs font-mono text-white">{report.confidence}%</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-text-secondary uppercase tracking-wider">AI Recommendation</div>
                <div className="font-bold text-white uppercase tracking-widest">{report.recommendedAction}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 5: Decision Engine */}
      <section className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-brand-primary/50 flex items-center gap-2">
          <CheckCircle2 className="text-success" size={18} />
          <h2 className="text-sm font-semibold text-white">5. Human Decision Engine</h2>
        </div>
        <div className="p-6 flex items-center gap-4 justify-end bg-gradient-to-r from-transparent to-brand-primary/30">
           {role === 'FINANCE_MANAGER' ? (
            <>
              <button 
                onClick={() => handleAction('REJECT_RECOMMENDATION')}
                disabled={isActionPending}
                className="btn-primary bg-critical/20 text-critical hover:bg-critical/30 border-critical/50 flex items-center gap-2 py-3 px-6 text-sm"
              >
                <XCircle size={18} />
                Reject
              </button>
              <button 
                onClick={() => handleAction('APPROVE_RECOMMENDATION')}
                disabled={isActionPending}
                className="btn-primary bg-success text-black hover:bg-success/90 border-transparent flex items-center gap-2 py-3 px-8 text-sm font-bold shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                <CheckCircle2 size={18} />
                Approve Fix
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleAction('ESCALATE')}
                disabled={isActionPending}
                className="btn-primary bg-warning/20 text-warning hover:bg-warning/30 border-warning/50 flex items-center gap-2 py-3 px-6 text-sm"
              >
                <AlertCircle size={18} />
                Escalate to Manager
              </button>
              <button 
                onClick={() => handleAction('RESOLVE')}
                disabled={isActionPending}
                className="btn-primary bg-success text-black hover:bg-success/90 border-transparent flex items-center gap-2 py-3 px-8 text-sm font-bold shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                <CheckCircle2 size={18} />
                Mark Resolved
              </button>
            </>
          )}
        </div>
      </section>
      
    </div>
  );
}
