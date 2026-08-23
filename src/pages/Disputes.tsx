import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useDisputes } from '../hooks/useSupabase';

export default function Disputes() {
  const { data: disputes, isLoading } = useDisputes();

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading disputes...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Disputes</h1>
        <p className="text-text-secondary">Manage chargebacks and dispute claims.</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">ID</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Payment / Order</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Reason</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Deadline</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {disputes?.map((disp) => (
              <tr key={disp.dispute_id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <span className="font-mono text-sm text-white">{disp.dispute_id}</span>
                </td>
                <td className="p-4 text-sm text-text-secondary flex flex-col gap-1">
                  <span className="font-mono">{disp.payment_id}</span>
                  <span className="text-xs opacity-70">{disp.payments?.order_id}</span>
                </td>
                <td className="p-4 font-semibold text-white tabular-nums">
                  ₹{(disp.amount / 100).toFixed(2)}
                </td>
                <td className="p-4">
                  <span className="text-sm text-text-secondary truncate block max-w-[150px]">{disp.reason}</span>
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium capitalize
                    ${disp.status === 'won' ? 'bg-success/10 text-success' : 
                      disp.status === 'lost' ? 'bg-critical/10 text-critical' : 
                      disp.action_required ? 'bg-warning/10 text-warning' :
                      'bg-white/10 text-text-secondary'}`}>
                    {disp.status === 'won' && <CheckCircle2 size={12} />}
                    {disp.status === 'lost' && <AlertCircle size={12} />}
                    {disp.status === 'created' || disp.status === 'under_review' ? <Clock size={12} /> : null}
                    {disp.status.replace('_', ' ')}
                  </div>
                </td>
                <td className="p-4 text-sm text-text-secondary tabular-nums">
                  {disp.evidence_deadline ? new Date(disp.evidence_deadline).toLocaleDateString() : 'N/A'}
                </td>
                <td className="p-4 text-right">
                  <Link to={`/investigations/dispute/${disp.dispute_id}`} className="btn-secondary text-xs py-1.5 px-3">
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
