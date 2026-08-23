import { Link } from 'react-router-dom';
import { Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useMerchantHealth } from '../hooks/useSupabase';

export default function Merchants() {
  const { data: merchants, isLoading } = useMerchantHealth();

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading merchants...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Merchants</h1>
        <p className="text-text-secondary">Overview of merchant financial health and risk exposure.</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Merchant</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Health</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Success Rate</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Variance Exposure</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {merchants?.map((mh) => (
              <tr key={mh.merchant_id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <p className="font-medium text-white">{mh.merchants?.business_name}</p>
                  <span className="font-mono text-xs text-text-secondary">{mh.merchant_id}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${mh.health_score > 80 ? 'bg-success' : mh.health_score > 60 ? 'bg-warning' : 'bg-critical'}`}
                        style={{ width: `${mh.health_score}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-white">{mh.health_score}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                    ${mh.status === 'Healthy' ? 'bg-success/10 text-success' : 
                      mh.status === 'Critical' ? 'bg-critical/10 text-critical' : 
                      'bg-warning/10 text-warning'}`}>
                    {mh.status}
                  </div>
                </td>
                <td className="p-4 font-semibold text-white tabular-nums">
                  {mh.payment_success_rate}%
                </td>
                <td className="p-4 font-semibold text-white tabular-nums">
                  ₹{(mh.settlement_variance / 100).toFixed(2)}
                </td>
                <td className="p-4 text-right">
                  <button className="btn-secondary text-xs py-1.5 px-3">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
