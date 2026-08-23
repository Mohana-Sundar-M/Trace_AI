import { Link } from 'react-router-dom';
import { RefreshCcw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useRefunds } from '../hooks/useSupabase';

export default function Refunds() {
  const { data: refunds, isLoading } = useRefunds();

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading refunds...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Refunds</h1>
        <p className="text-text-secondary">Monitor refund processing and lifecycle.</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">ID</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Payment / Order</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Speed</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {refunds?.map((ref) => (
              <tr key={ref.refund_id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <span className="font-mono text-sm text-white">{ref.refund_id}</span>
                </td>
                <td className="p-4 text-sm text-text-secondary flex flex-col gap-1">
                  <span className="font-mono">{ref.payment_id}</span>
                  <span className="text-xs opacity-70">{ref.payments?.order_id}</span>
                </td>
                <td className="p-4 font-semibold text-white tabular-nums">
                  ₹{(ref.amount / 100).toFixed(2)}
                </td>
                <td className="p-4">
                  <span className="text-sm capitalize text-text-secondary">{ref.speed_processed}</span>
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium capitalize
                    ${ref.status === 'processed' ? 'bg-success/10 text-success' : 
                      ref.status === 'failed' ? 'bg-critical/10 text-critical' : 
                      'bg-white/10 text-text-secondary'}`}>
                    {ref.status === 'processed' && <CheckCircle2 size={12} />}
                    {ref.status === 'failed' && <AlertCircle size={12} />}
                    {ref.status === 'created' ? <Clock size={12} /> : null}
                    {ref.status.replace('_', ' ')}
                  </div>
                </td>
                <td className="p-4 text-sm text-text-secondary tabular-nums">
                  {new Date(ref.created_at).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <Link to={`/investigations/refund/${ref.refund_id}`} className="btn-secondary text-xs py-1.5 px-3">
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
