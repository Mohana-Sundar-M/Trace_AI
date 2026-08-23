import { Clock, ShieldCheck, User } from 'lucide-react';
import { useAuditLogs } from '../hooks/useSupabase';

export default function AuditTrail() {
  const { data: logs, isLoading } = useAuditLogs();

  if (isLoading) {
    return <div className="text-white animate-pulse">Loading audit trail...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Audit Trail</h1>
        <p className="text-text-secondary">Immutable record of all system state changes and operational actions.</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Timestamp</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actor</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Action</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Entity</th>
              <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">State Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs?.map((log) => (
              <tr key={log.audit_id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock size={14} />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                      {log.actor_type === 'USER' ? <User size={12} /> : <ShieldCheck size={12} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{log.actor_id}</p>
                      <p className="text-[10px] text-text-secondary uppercase">{log.actor_type}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="bg-brand-primary border border-white/10 px-2 py-1 rounded text-xs font-medium text-accent-teal">
                    {log.action}
                  </span>
                  {log.reason && <p className="text-xs text-text-secondary mt-1">{log.reason}</p>}
                </td>
                <td className="p-4">
                  <p className="text-sm text-white">{log.entity_type}</p>
                  <p className="font-mono text-xs text-text-secondary">{log.entity_id}</p>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-warning">{log.before_state?.status || 'N/A'}</span>
                    <span className="text-text-secondary">→</span>
                    <span className="text-success">{log.after_state?.status || 'N/A'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
