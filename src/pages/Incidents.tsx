import { Link } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, AlertCircle } from 'lucide-react';
import { useIncidents } from '../hooks/useSupabase';

export default function Incidents() {
  const { data: incidents, isLoading } = useIncidents();

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading incidents...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Active Incidents</h1>
        <p className="text-text-secondary">Grouped financial anomalies requiring operational attention.</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Severity</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Incident</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Impact</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Detected</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {incidents?.map((inc) => (
              <tr key={inc.incident_id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                    ${inc.severity === 'CRITICAL' ? 'bg-critical/10 text-critical' : 
                      inc.severity === 'HIGH' ? 'bg-warning/10 text-warning' : 
                      'bg-white/10 text-text-secondary'}`}>
                    {inc.severity === 'CRITICAL' && <ShieldAlert size={14} />}
                    {inc.severity === 'HIGH' && <AlertTriangle size={14} />}
                    {inc.severity === 'MEDIUM' && <AlertCircle size={14} />}
                    {inc.severity}
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-medium text-white">{inc.title}</p>
                  <p className="text-xs font-mono text-text-secondary">{inc.incident_id}</p>
                </td>
                <td className="p-4 font-semibold text-white tabular-nums">
                  ₹{(inc.potential_loss / 100).toFixed(2)}
                </td>
                <td className="p-4">
                  <span className={`text-xs font-medium ${inc.status === 'AI_RECOMMENDED' ? 'text-accent-blue' : 'text-text-secondary'}`}>
                    {inc.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-4 text-sm text-text-secondary">
                  {new Date(inc.detected_at).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <Link to={`/investigations/incident/${inc.incident_id}`} className="btn-secondary text-xs py-1.5 px-3">
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
