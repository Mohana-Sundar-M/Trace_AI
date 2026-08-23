import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Event = {
  id: string;
  timestamp: string;
  message: string;
  type: 'payment' | 'settlement' | 'exception' | 'incident' | 'webhook';
};

export default function LiveEventsPanel() {
  const { merchantId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Fetch initial latest 5 events from exceptions just to populate
    const fetchInitial = async () => {
      const { data } = await supabase.from('exceptions').select('exception_id, type, detected_at').order('detected_at', { ascending: false }).limit(5);
      if (data) {
        setEvents(data.map(d => ({
          id: d.exception_id,
          timestamp: d.detected_at,
          message: `Exception ${d.exception_id} created: ${d.type}`,
          type: 'exception'
        })));
      }
    };
    fetchInitial();

    const addEvent = (e: Event) => {
      setEvents(prev => [e, ...prev].slice(0, 10)); // keep last 10
    };

    // Subscriptions
    const channel = supabase.channel('live-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, payload => {
        addEvent({ id: payload.new.payment_id, timestamp: payload.new.created_at, message: `Payment ${payload.new.payment_id} created`, type: 'payment' });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'webhook_events' }, payload => {
        addEvent({ id: payload.new.event_id, timestamp: payload.new.created_at, message: `Webhook ${payload.new.event_type} received`, type: 'webhook' });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'settlements' }, payload => {
        addEvent({ id: payload.new.settlement_id, timestamp: payload.new.created_at, message: `Settlement ${payload.new.settlement_id} created`, type: 'settlement' });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exceptions' }, payload => {
        addEvent({ id: payload.new.exception_id, timestamp: payload.new.detected_at, message: `Exception ${payload.new.exception_id} created: ${payload.new.type}`, type: 'exception' });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="glass-panel rounded-xl border border-white/5 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-white/5 bg-brand-primary/50 flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-teal opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-teal"></span>
        </div>
        <h2 className="font-semibold text-white text-sm">LIVE TRACE EVENTS</h2>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {events.length === 0 && (
          <p className="text-xs text-text-secondary">Waiting for events...</p>
        )}
        {events.map((ev, i) => (
          <div key={`${ev.id}-${i}`} className="animate-in slide-in-from-right-2 fade-in duration-300">
            <p className="text-[10px] text-text-secondary font-mono">
              {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
            </p>
            <p className="text-xs text-white mt-0.5">{ev.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
