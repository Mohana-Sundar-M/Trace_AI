import { Box, Play, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Reconciliation() {
  const { merchantId, canModifySystem } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runEngine = async () => {
    setIsProcessing(true);
    setResult(null);
    try {
      // We don't have a direct exposed API for this in the previous code,
      // but we could theoretically add one or just simulate the frontend state for now,
      // or we can just show the UI for it.
      // For this demo, let's simulate a call to a theoretical /api/reconcile
      setTimeout(() => {
        setResult({
          processed: 1250,
          matched: 1245,
          exceptions: 5,
          time: '1.2s'
        });
        setIsProcessing(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reconciliation Engine</h1>
        <p className="text-text-secondary">Deterministic matching for Payments, Refunds, and Bank Statements.</p>
      </div>

      <div className="glass-panel rounded-xl p-8 text-center max-w-2xl mx-auto mt-12 space-y-6">
        <div className="mx-auto w-16 h-16 bg-brand-primary border border-white/10 rounded-2xl flex items-center justify-center">
          <Box className="text-accent-blue" size={32} />
        </div>
        
        <div>
          <h2 className="text-xl font-medium text-white mb-2">Run Matching Engine</h2>
          <p className="text-text-secondary text-sm">
            Execute the deterministic reconciliation engine to match bank transactions against the internal ledger. This will identify variances and generate exceptions.
          </p>
        </div>

        <button 
          onClick={runEngine}
          disabled={!canModifySystem || isProcessing}
          className={`btn-primary mx-auto flex items-center gap-2 ${(!canModifySystem || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Play size={18} />
          )}
          {isProcessing ? 'Processing Ledger...' : 'Run Reconciliation Now'}
        </button>
        
        {!canModifySystem && (
          <p className="text-xs text-critical">You do not have permission to run the engine manually.</p>
        )}

        {result && (
          <div className="mt-8 p-6 bg-success/5 border border-success/20 rounded-lg animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-center gap-2 text-success mb-4">
              <CheckCircle2 size={20} />
              <span className="font-semibold">Reconciliation Complete ({result.time})</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-left">
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Processed</p>
                <p className="text-xl font-bold text-white">{result.processed}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Matched</p>
                <p className="text-xl font-bold text-success">{result.matched}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Exceptions</p>
                <p className="text-xl font-bold text-warning">{result.exceptions}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
