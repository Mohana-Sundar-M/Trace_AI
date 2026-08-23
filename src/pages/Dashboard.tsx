import { ArrowUpRight, ArrowDownRight, Activity, ShieldAlert, CheckCircle2, ServerCrash, CreditCard, Box, Search, Play, Bot, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMerchantHealth, useIncidents, useExceptions, useWorkflowStats } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import LiveEventsPanel from '../components/LiveEventsPanel';
import AISettingsModal from '../components/AISettingsModal';
import { useState } from 'react';

export default function Dashboard() {
  const { merchantId } = useAuth();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { data: healthData, isLoading: healthLoading } = useMerchantHealth();
  const { data: incidents, isLoading: incLoading } = useIncidents();
  const { data: exceptions } = useExceptions();
  const { data: stats } = useWorkflowStats();

  const health = healthData?.[0];
  const openIncidents = incidents?.filter(i => i.status !== 'RESOLVED' && i.status !== 'HUMAN_REJECTED') || [];
  const openExceptions = exceptions?.filter(e => e.status !== 'RESOLVED' && e.status !== 'CLOSED') || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      
      {/* Product Introduction */}
      <div className="text-center space-y-4 py-8 border-b border-white/5">
        <h1 className="text-4xl font-bold tracking-tight text-white flex items-center justify-center gap-3">
          <Activity className="text-accent-teal" size={36} />
          TRACE
        </h1>
        <h2 className="text-xl text-accent-blue font-medium">AI Financial Investigation & Reconciliation</h2>
        <p className="text-text-secondary max-w-2xl mx-auto text-sm leading-relaxed">
          Welcome to the TRACE interactive demo. This environment is pre-populated with synthetic financial data to showcase our automated anomaly detection and AI-driven investigation workflow.
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-mono font-medium border border-accent-blue/20">
            <Activity size={14} />
            INTERACTIVE DEMO ENVIRONMENT
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-text-secondary hover:text-white hover:bg-white/10 transition-colors text-xs font-mono font-medium border border-white/10">
            <Bot size={14} />
            CONFIGURE AI
          </button>
        </div>
      </div>

      {/* Workflow Diagram */}
      <div className="glass-panel p-6 rounded-xl border border-white/10">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-6 text-center">TRACE WORKFLOW</h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          <WorkflowStep icon={<CreditCard size={20} />} title="DATA" count={stats?.data || 0} route="/operations" />
          <WorkflowArrow />
          <WorkflowStep icon={<Search size={20} />} title="DETECTED" count={stats?.detected || 0} route="/monitoring" />
          <WorkflowArrow />
          <WorkflowStep icon={<ShieldAlert size={20} />} title="EXCEPTIONS" count={stats?.exceptions || 0} route="/exceptions" />
          <WorkflowArrow />
          <WorkflowStep icon={<Activity size={20} />} title="INVESTIGATIONS" count={stats?.investigations || 0} route="/investigations" />
          <WorkflowArrow />
          <WorkflowStep icon={<AlertTriangle size={20} />} title="HUMAN REVIEW" count={stats?.review || 0} route="/exceptions" />
          <WorkflowArrow />
          <WorkflowStep icon={<CheckCircle2 size={20} />} title="RESOLVED" count={stats?.resolved || 0} route="/audit" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Payment Success Rate" value={`${health?.payment_success_rate || '0.0'}%`} trend={health?.payment_success_rate > 95 ? "Healthy" : "Degraded"} isPositive={health?.payment_success_rate > 95} route="/payments" />
        <MetricCard title="Settlement Variance" value={`₹${((health?.settlement_variance || 0) / 100).toLocaleString()}`} trend="Tracked" isPositive={health?.settlement_variance === 0} highlight={health?.settlement_variance > 0} route="/reconciliation" />
        <MetricCard title="Open Exceptions" value={openExceptions.length.toString()} trend="Requires Review" isPositive={openExceptions.length === 0} highlight={openExceptions.length > 0} route="/exceptions" />
        <MetricCard title="Open Incidents" value={openIncidents.length.toString()} trend="Active" isPositive={openIncidents.length === 0} highlight={openIncidents.length > 0} route="/incidents" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* What Needs Attention */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-brand-primary/50">
            <h2 className="font-semibold text-white">What Needs Attention</h2>
          </div>
          <div className="p-4 space-y-3">
            {openIncidents.slice(0, 5).map(inc => (
              <ExceptionItem 
                key={inc.incident_id}
                id={inc.incident_id} 
                type={inc.title} 
                amount={`₹${(inc.potential_loss / 100).toLocaleString()}`} 
                severity={inc.severity} 
                route={`/investigations/incident/${inc.incident_id}`}
              />
            ))}
            {openExceptions.slice(0, 5 - Math.min(openIncidents.length, 5)).map(ex => (
              <ExceptionItem 
                key={ex.exception_id}
                id={ex.exception_id} 
                type={ex.type} 
                amount={`₹${(ex.amount / 100).toLocaleString()}`} 
                severity={ex.severity} 
                route={ex.incident_id ? `/investigations/incident/${ex.incident_id}` : '/exceptions'}
              />
            ))}
            {(openIncidents.length === 0 && openExceptions.length === 0) && (
              <p className="text-text-secondary text-sm p-4 text-center">No active issues requiring attention.</p>
            )}
          </div>
        </div>

        {/* Demo Call to Action & Ask Trace */}
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-accent-blue/30 bg-gradient-to-br from-brand-primary to-accent-blue/5 p-6 flex flex-col items-center justify-center text-center">
            <Bot className="text-accent-teal mb-3" size={32} />
            <h2 className="text-lg font-bold text-white mb-2">Ask TRACE</h2>
            <p className="text-xs text-text-secondary mb-4 max-w-sm">
              Use natural language to query operations and investigate exceptions.
            </p>
            <Link to="/ask" className="btn-secondary w-full text-center">
              Open Ask TRACE
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel rounded-xl border border-white/10 p-4 flex flex-col items-center justify-center text-center">
              <Box className="text-text-secondary mb-2" size={24} />
              <p className="text-xs text-white font-semibold mb-2">Data Simulator</p>
              <Link to="/simulator" className="btn-primary w-full flex items-center justify-center gap-1 py-1 px-2 text-xs">
                <Play size={12} />
                Run
              </Link>
            </div>
            <div className="h-48 overflow-hidden rounded-xl">
              <LiveEventsPanel />
            </div>
          </div>
        </div>

      </div>
      {isSettingsOpen && (
        <AISettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}

function WorkflowStep({ icon, title, count, route }: { icon: React.ReactNode, title: string, count: number, route: string }) {
  return (
    <Link to={route} className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform cursor-pointer">
      <div className="w-12 h-12 rounded-full bg-brand-primary border border-white/10 flex items-center justify-center text-accent-teal group-hover:border-accent-teal/50 group-hover:bg-accent-teal/10 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-white tracking-wider group-hover:text-accent-teal transition-colors">{title}</p>
        <p className="text-lg font-mono text-text-secondary mt-1">{count.toLocaleString()}</p>
      </div>
    </Link>
  );
}

function WorkflowArrow() {
  return (
    <div className="hidden md:block w-8 h-px bg-white/20 relative">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-white/20 transform rotate-45"></div>
    </div>
  );
}

function MetricCard({ title, value, trend, isPositive, highlight, route }: { title: string, value: string, trend: string, isPositive: boolean, highlight?: boolean, route: string }) {
  return (
    <Link to={route} className={`block glass-panel rounded-xl p-5 hover:scale-105 transition-transform ${highlight ? 'border-warning/30 bg-warning/5 hover:border-warning/60' : 'border-white/5 hover:border-white/20'}`}>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${highlight ? 'text-warning' : 'text-white'}`}>{value}</span>
      </div>
      <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${isPositive ? 'bg-success/10 text-success' : 'bg-white/10 text-text-secondary'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </Link>
  );
}

function ExceptionItem({ id, type, amount, severity, route }: { id: string, type: string, amount: string, severity: string, route: string }) {
  const isCritical = severity === 'CRITICAL';
  const isHigh = severity === 'HIGH';
  
  return (
    <div className="group bg-brand-primary/50 border border-white/5 hover:border-white/10 rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-text-secondary">{id}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider
            ${isCritical ? 'bg-critical/10 text-critical' : isHigh ? 'bg-warning/10 text-warning' : 'bg-white/5 text-text-secondary'}`}>
            {severity}
          </span>
        </div>
        <p className="text-sm font-medium text-white">{type}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-white tabular-nums">{amount}</p>
        <Link to={route} className="text-xs text-accent-teal opacity-0 group-hover:opacity-100 transition-opacity">
          Investigate
        </Link>
      </div>
    </div>
  );
}
