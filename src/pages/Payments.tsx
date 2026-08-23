import { Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { usePayments } from '../hooks/useSupabase';

export default function Payments() {
  const { data: payments, isLoading } = usePayments();

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading payments...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Payments</h1>
        <p className="text-text-secondary">Track real-time payment states and captures.</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">ID</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Order</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Method</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments?.map((pay) => (
              <tr key={pay.payment_id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <span className="font-mono text-sm text-white">{pay.payment_id}</span>
                </td>
                <td className="p-4 text-sm text-text-secondary">
                  {pay.order_id}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm text-text-secondary uppercase">
                    <CreditCard size={14} />
                    {pay.method}
                  </div>
                </td>
                <td className="p-4 font-semibold text-white tabular-nums">
                  ₹{(pay.amount / 100).toFixed(2)}
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium capitalize
                    ${pay.status === 'captured' ? 'bg-success/10 text-success' : 
                      pay.status === 'failed' ? 'bg-critical/10 text-critical' : 
                      'bg-white/10 text-text-secondary'}`}>
                    {pay.status === 'captured' && <CheckCircle2 size={12} />}
                    {pay.status === 'failed' && <AlertCircle size={12} />}
                    {pay.status === 'created' || pay.status === 'authorized' ? <Clock size={12} /> : null}
                    {pay.status.replace('_', ' ')}
                  </div>
                </td>
                <td className="p-4 text-sm text-text-secondary tabular-nums">
                  {new Date(pay.created_at).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <Link to={`/investigations/payment/${pay.payment_id}`} className="btn-secondary text-xs py-1.5 px-3">
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
