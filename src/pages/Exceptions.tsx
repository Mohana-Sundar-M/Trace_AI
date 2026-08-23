import { Link } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { useExceptions } from '../hooks/useSupabase';

export default function Exceptions() {
  const { data: exceptions, isLoading } = useExceptions();

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading exceptions...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Exceptions</h1>
        <p className="text-text-secondary">Individual financial or operational problems detected by TRACE.</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Severity</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Exception</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Entity</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Detected</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {exceptions?.map((exc) => (
              <tr key={exc.exception_id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                    ${exc.severity === 'CRITICAL' ? 'bg-critical/10 text-critical' : 
                      exc.severity === 'HIGH' ? 'bg-warning/10 text-warning' : 
                      'bg-white/10 text-text-secondary'}`}>
                    {exc.severity === 'CRITICAL' && <ShieldAlert size={14} />}
                    {exc.severity === 'HIGH' && <AlertTriangle size={14} />}
                    {exc.severity === 'MEDIUM' && <AlertCircle size={14} />}
                    {exc.severity}
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-medium text-white">{exc.type}</p>
                  <p className="text-xs font-mono text-text-secondary">{exc.exception_id}</p>
                </td>
                <td className="p-4 font-mono text-xs text-text-secondary">
                  {exc.entity_id}
                </td>
                <td className="p-4 font-semibold text-white tabular-nums">
                  ₹{(exc.amount / 100).toFixed(2)}
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium capitalize border
                    ${exc.status === 'RESOLVED' ? 'bg-success/5 text-success border-success/10' : 
                      exc.status === 'CLOSED' ? 'bg-white/5 text-text-secondary border-white/5' : 
                      exc.status === 'HUMAN_REVIEW' ? 'bg-warning/5 text-warning border-warning/10' :
                      'bg-accent-blue/5 text-accent-blue border-accent-blue/10'}`}>
                    {exc.status === 'RESOLVED' && <Clock size={12} />}
                    {exc.status.replace(/_/g, ' ')}
                  </div>
                </td>
                <td className="p-4 text-sm text-text-secondary">
                  {new Date(exc.detected_at).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  {/* Route to the incident workspace if grouped, otherwise to the direct entity workspace */}
                  <Link 
                    to={exc.incident_id ? `/investigations/incident/${exc.incident_id}` : `/investigations/${exc.entity_type}/${exc.entity_id}`} 
                    className="btn-secondary text-xs py-1.5 px-3"
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
