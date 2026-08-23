import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, CreditCard, Box, FileText, Search, ShieldAlert, AlertTriangle, History, ActivitySquare, ServerCrash, Bot, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../contexts/AuthContext';

export default function Layout() {
  const { role, setRole, merchantId, aiApiKey } = useAuth();
  const navigate = useNavigate();
  
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResult, setAskResult] = useState<any>(null);

  const handleAsk = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && askQuery.trim()) {
      setIsAsking(true);
      setAskResult(null);
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-AI-Key': aiApiKey
          },
          body: JSON.stringify({ query: askQuery, merchantId })
        });
        if (res.ok) {
          const data = await res.json();
          setAskResult(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAsking(false);
      }
    }
  };
  return (
    <div className="flex h-screen w-full overflow-hidden bg-brand-primary text-text-primary">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-brand-surface flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-accent-teal" />
            TRACE
          </h1>
          <p className="text-xs text-text-secondary mt-1 tracking-wider uppercase">{role.replace('_', ' ')}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div className="space-y-1">
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Overview" />
            <NavItem to="/ask" icon={<Bot size={18} />} label="Ask TRACE" />
          </div>

          <div>
            <h3 className="px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Operations</h3>
            <div className="space-y-1">
              <NavItem to="/payments" icon={<CreditCard size={18} />} label="Payments" />
              <NavItem to="/settlements" icon={<FileText size={18} />} label="Settlements" />
              <NavItem to="/refunds" icon={<Activity size={18} />} label="Refunds" />
              <NavItem to="/disputes" icon={<AlertTriangle size={18} />} label="Disputes" />
              <NavItem to="/reconciliation" icon={<Box size={18} />} label="Reconciliation" />
            </div>
          </div>

          <div>
            <h3 className="px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Investigation</h3>
            <div className="space-y-1">
              <NavItem to="/exceptions" icon={<ShieldAlert size={18} />} label="Exceptions" />
              <NavItem to="/incidents" icon={<ServerCrash size={18} />} label="Incidents" />
            </div>
          </div>

          <div>
            <h3 className="px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">System</h3>
            <div className="space-y-1">
              <NavItem to="/audit" icon={<History size={18} />} label="Audit Trail" />
              <NavItem to="/simulator" icon={<ActivitySquare size={18} />} label="Data Simulator" />
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary font-medium">Simulate Role</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-brand-surface border border-white/10 text-white text-xs rounded p-1.5 focus:outline-none focus:border-accent-teal"
            >
              <option value="OPERATIONS_ANALYST">Operations Analyst</option>
              <option value="FINANCE_MANAGER">Finance Manager</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-semibold">
              TU
            </div>
            <div>
              <p className="text-sm font-medium text-white">Trace User</p>
              <p className="text-xs text-success">Active Session</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Command Bar */}
        <header className="h-16 border-b border-white/5 bg-brand-surface/50 backdrop-blur-md flex items-center px-6 justify-between z-50">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              onKeyDown={handleAsk}
              autoComplete="off"
              placeholder="Ask TRACE to investigate or search ID..." 
              className="w-full bg-brand-card border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/50 transition-all"
            />
            {isAsking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={16} className="text-accent-teal animate-spin" />
              </div>
            )}
            
            {/* Ask TRACE Result Dropdown */}
            {askResult && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-brand-surface border border-white/10 rounded-lg shadow-xl overflow-hidden p-1 animate-in slide-in-from-top-2">
                <div className="bg-brand-primary/50 p-4 rounded-md">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-accent-blue/20 text-accent-blue p-1.5 rounded-md">
                      <Bot size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white mb-3 leading-relaxed">{askResult.aiResponse}</p>
                      <div className="flex gap-2">
                        {askResult.suggestedUrl && askResult.suggestedAction && (
                          <button 
                            onClick={() => {
                              navigate(askResult.suggestedUrl);
                              setAskResult(null);
                              setAskQuery('');
                            }}
                            className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3"
                          >
                            {askResult.suggestedAction}
                            <ArrowRight size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => setAskResult(null)}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
        isActive 
          ? "bg-accent-teal/10 text-accent-teal" 
          : "text-text-secondary hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      {label}
    </NavLink>
  );
}
