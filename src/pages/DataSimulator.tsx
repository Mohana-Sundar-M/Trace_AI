// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Database, RefreshCcw, Loader2, CheckCircle2, AlertTriangle, ShieldAlert, FileText, CreditCard, Activity, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DataSimulator() {
  const navigate = useNavigate();
  const { canModifySystem } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const runScenario = async (scenarioId: string, description: string) => {
    setIsRunning(true);
    setActiveScenario(scenarioId);
    setResult(null);

    try {
      const res = await fetch('/api/simulator/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run scenario');
      }
      
      
      // Parse generated ID for quick navigation
      let generatedEntity = null;
      const incMatch = data.stdout?.match(/INC_[A-Z0-9]+/);
      const excMatch = data.stdout?.match(/EXC_[A-Z0-9]+/);
      const setlMatch = data.stdout?.match(/SETL_[A-Z0-9]+/);
      
      if (incMatch) generatedEntity = { type: 'incident', id: incMatch[0] };
      else if (excMatch) generatedEntity = { type: 'exception', id: excMatch[0] };
      else if (setlMatch) generatedEntity = { type: 'settlement', id: setlMatch[0] };

      setResult({
        success: true,
        title: description,
        details: 'Data generated successfully. TRACE anomaly detection engines have processed the new events.',
        output: data.stdout,
        generatedEntity
      });
    } catch (err: any) {
      setResult({
        success: false,
        title: 'Simulation Failed',
        details: err.message
      });
    } finally {
      setIsRunning(false);
      setActiveScenario(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Data Simulator</h1>
          <p className="text-text-secondary">Generate synthetic financial data and inject anomalies deterministically.</p>
        </div>
      </div>

      {!canModifySystem && (
        <div className="bg-critical/10 border border-critical/20 rounded-lg p-4 flex gap-3 text-critical text-sm">
          <AlertTriangle size={18} />
          You need SYSTEM_ADMIN or FINANCE_MANAGER privileges to generate synthetic data.
        </div>
      )}

      {/* Demo Center / Scenarios */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">One-Click Testing Scenarios</h2>
        <p className="text-sm text-text-secondary mb-4">
          Click any scenario below to instantly generate the necessary records to test TRACE's investigation engine.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ScenarioCard 
            title="Normal Payment Flow" 
            desc="Creates a clean, end-to-end payment that reconciles perfectly."
            icon={<CheckCircle2 className="text-success" />}
            onClick={() => runScenario('NORMAL', 'Normal Payment Flow')}
            disabled={!canModifySystem || isRunning}
            loading={activeScenario === 'NORMAL'}
          />
          <ScenarioCard 
            title="Settlement Variance" 
            desc="Injects an unexplained ₹50,000 variance in a daily settlement."
            icon={<ShieldAlert className="text-warning" />}
            onClick={() => runScenario('VARIANCE', 'Settlement Variance')}
            disabled={!canModifySystem || isRunning}
            loading={activeScenario === 'VARIANCE'}
          />
          <ScenarioCard 
            title="Webhook Failure" 
            desc="Fails 3 consecutive webhooks, leaving the payment state inconsistent."
            icon={<AlertTriangle className="text-critical" />}
            onClick={() => runScenario('WEBHOOK_FAIL', 'Webhook Failure')}
            disabled={!canModifySystem || isRunning}
            loading={activeScenario === 'WEBHOOK_FAIL'}
          />
          <ScenarioCard 
            title="Refund Spike" 
            desc="Generates an abnormal volume of refunds triggering the velocity anomaly detector."
            icon={<Activity className="text-warning" />}
            onClick={() => runScenario('REFUND_SPIKE', 'Refund Spike')}
            disabled={!canModifySystem || isRunning}
            loading={activeScenario === 'REFUND_SPIKE'}
          />
          <ScenarioCard 
            title="Duplicate Transaction" 
            desc="Simulates two identical bank credits for the same UTR."
            icon={<FileText className="text-critical" />}
            onClick={() => runScenario('DUPLICATE', 'Duplicate Transaction')}
            disabled={!canModifySystem || isRunning}
            loading={activeScenario === 'DUPLICATE'}
          />
          <ScenarioCard 
            title="Payment Degradation" 
            desc="Simulates a sudden drop in success rate for a specific merchant."
            icon={<CreditCard className="text-warning" />}
            onClick={() => runScenario('DEGRADATION', 'Payment Degradation')}
            disabled={!canModifySystem || isRunning}
            loading={activeScenario === 'DEGRADATION'}
          />
        </div>
      </div>

      {result && (
        <div className={`mt-8 p-6 border rounded-xl animate-in slide-in-from-bottom-4 ${result.success ? 'bg-success/5 border-success/20' : 'bg-critical/5 border-critical/20'}`}>
          <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${result.success ? 'text-success' : 'text-critical'}`}>
            {result.success ? <CheckCircle2 /> : <ShieldAlert />}
            {result.title}
          </h3>
          <p className="text-white text-sm mb-4">{result.details}</p>
          
          {result.output && (
            <div className="bg-black/50 p-4 rounded-md overflow-x-auto mb-4">
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">{result.output}</pre>
            </div>
          )}
          
          {result.generatedEntity && (
            <button
              onClick={() => navigate(`/investigations/${result.generatedEntity.type}/${result.generatedEntity.id}`)}
              className="mt-4 w-full bg-accent-blue text-white py-3 rounded-lg font-medium hover:bg-accent-blue/90 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
            >
              View TRACE Flow <ArrowRight size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioCard({ title, desc, icon, onClick, disabled, loading }: any) {
  return (
    <div className="glass-panel p-5 rounded-xl border border-white/5 hover:border-accent-blue/30 transition-all flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-white/5 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
      </div>
      <p className="text-sm text-text-secondary flex-1 mb-4">{desc}</p>
      
      <button 
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-2 rounded-md font-medium text-xs flex items-center justify-center gap-2 transition-all
          ${disabled ? 'bg-white/5 text-text-secondary cursor-not-allowed' : 'bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30'}`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Play size={14} />
        )}
        Run Scenario
      </button>
    </div>
  );
}
