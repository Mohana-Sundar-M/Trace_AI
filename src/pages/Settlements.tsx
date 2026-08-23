import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, AlertCircle, BrainCircuit, ArrowRight } from 'lucide-react';
import { useSettlements } from '../hooks/useSupabase';

export default function Settlements() {
  const { data: settlements, isLoading } = useSettlements();
  const [query, setQuery] = useState('');

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading settlements...</div>;
  }

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    // Redirect to the global search trigger (for now we can just alert or simulate a global event, but Layout has the real search bar)
    alert(`Please use the global search bar at the top for: "${query}"`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settlements</h1>
          <p className="text-text-secondary">Track payouts, bank credits, and ledger variances.</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-accent-blue/20 bg-gradient-to-r from-brand-primary to-brand-primary/50">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <BrainCircuit className="text-accent-teal" size={20} />
              Need to investigate a discrepancy?
            </h2>
            <p className="text-sm text-text-secondary">
              Use the top navigation command bar to search for any settlement ID (e.g. SETL_8291) or ask a general query like "Why did today's settlement fail?"
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-brand-primary/50 text-xs uppercase tracking-wider text-text-secondary">
              <th className="py-4 px-6 font-semibold">Settlement ID</th>
              <th className="py-4 px-6 font-semibold">Net Amount</th>
              <th className="py-4 px-6 font-semibold">Status</th>
              <th className="py-4 px-6 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {settlements?.map((setl) => (
              <tr key={setl.settlement_id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-text-secondary" />
                    <span className="font-mono text-sm text-white font-medium">{setl.settlement_id}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-white tabular-nums">
                    ₹{(setl.amount / 100).toFixed(2)}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <StatusBadge status={setl.status} />
                </td>
                <td className="py-4 px-6 text-right">
                  <Link 
                    to={`/investigations/settlement/${setl.settlement_id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-white/5 text-white hover:bg-accent-teal hover:text-white transition-all"
                  >
                    Investigate
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isProcessed = status === 'processed';
  const isFailed = status === 'failed';
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize border
      ${isProcessed ? 'bg-success/5 text-success border-success/10' : 
        isFailed ? 'bg-critical/5 text-critical border-critical/10' : 
        'bg-white/5 text-text-secondary border-white/5'}`}
    >
      {isProcessed && <CheckCircle2 size={12} />}
      {isFailed && <AlertCircle size={12} />}
      {!isProcessed && !isFailed && <Clock size={12} />}
      {status}
    </div>
  );
}
