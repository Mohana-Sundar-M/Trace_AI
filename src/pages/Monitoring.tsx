import { useEffect, useState } from 'react';
import { ActivitySquare, Webhook, CreditCard, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Monitoring() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to Webhook Events
    const channel = supabase.channel('monitoring')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'webhook_events' }, (payload) => {
        setEvents(prev => [{
          id: payload.new.event_id,
          type: 'WEBHOOK',
          description: `Received ${payload.new.event_type} for ${payload.new.entity_type}`,
          time: new Date().toISOString()
        }, ...prev].slice(0, 50));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
        setEvents(prev => [{
          id: payload.new.payment_id,
          type: 'PAYMENT',
          description: `New payment created: ₹${(payload.new.amount/100).toFixed(2)}`,
          time: new Date().toISOString()
        }, ...prev].slice(0, 50));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exceptions' }, (payload) => {
        setEvents(prev => [{
          id: payload.new.exception_id,
          type: 'EXCEPTION',
          description: `Exception detected: ${payload.new.type}`,
          time: new Date().toISOString()
        }, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Real-time Monitoring</h1>
        <p className="text-text-secondary">Live stream of system events and anomaly detection hooks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-xl p-6 h-[600px] overflow-y-auto">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
            <ActivitySquare className="text-accent-teal" size={20} />
            Live Event Stream
          </h2>
          
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-text-secondary text-sm text-center mt-10 animate-pulse">Waiting for live events...</p>
            ) : (
              events.map((ev, i) => (
                <div key={`${ev.id}-${i}`} className="flex gap-4 p-4 rounded-lg bg-brand-primary/50 border border-white/5 items-start animate-in slide-in-from-top-2">
                  <div className={`p-2 rounded-md ${
                    ev.type === 'WEBHOOK' ? 'bg-accent-blue/10 text-accent-blue' :
                    ev.type === 'PAYMENT' ? 'bg-success/10 text-success' :
                    'bg-critical/10 text-critical'
                  }`}>
                    {ev.type === 'WEBHOOK' && <Webhook size={16} />}
                    {ev.type === 'PAYMENT' && <CreditCard size={16} />}
                    {ev.type === 'EXCEPTION' && <ShieldAlert size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{ev.description}</p>
                    <div className="flex gap-2 items-center mt-1 text-xs font-mono text-text-secondary">
                      <span>{ev.id}</span>
                      <span>•</span>
                      <span>{new Date(ev.time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">Event Ingestion</span>
                <span className="flex items-center gap-2 text-xs font-medium text-success">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">Anomaly Detection</span>
                <span className="flex items-center gap-2 text-xs font-medium text-success">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">Reconciliation Engine</span>
                <span className="text-xs text-text-secondary">Idle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
