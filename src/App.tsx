import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Settlements from './pages/Settlements';
import Incidents from './pages/Incidents';
import Payments from './pages/Payments';
import Refunds from './pages/Refunds';
import Disputes from './pages/Disputes';
import Merchants from './pages/Merchants';
import AuditTrail from './pages/AuditTrail';
import Monitoring from './pages/Monitoring';
import Reconciliation from './pages/Reconciliation';
import Exceptions from './pages/Exceptions';
import DataSimulator from './pages/DataSimulator';
import AskTrace from './pages/AskTrace';
import InvestigationWorkspace from './components/InvestigationWorkspace';
import { AuthProvider } from './contexts/AuthContext';

// Placeholders for remaining pages
const Orders = () => <div className="text-white">Orders (WIP)</div>;

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="payments" element={<Payments />} />
            <Route path="refunds" element={<Refunds />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="merchants" element={<Merchants />} />
            <Route path="audit" element={<AuditTrail />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="reconciliation" element={<Reconciliation />} />
            <Route path="settlements" element={<Settlements />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="exceptions" element={<Exceptions />} />
            <Route path="investigations" element={<Incidents />} />
            <Route path="investigations/:type/:id" element={<InvestigationWorkspace />} />
            <Route path="simulator" element={<DataSimulator />} />
            <Route path="ask" element={<AskTrace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
