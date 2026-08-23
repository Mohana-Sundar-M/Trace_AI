import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'OPERATIONS_ANALYST' | 'FINANCE_MANAGER' | 'AUDITOR';

interface AuthContextType {
  role: Role;
  merchantId: string | null;
  setRole: (role: Role) => void;
  setMerchantId: (id: string | null) => void;
  canApproveHighValue: boolean;
  canModifySystem: boolean;
  canInvestigate: boolean;
  isReadOnly: boolean;
  aiApiKey: string;
  setAiApiKey: (key: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default session
  const [role, setRole] = useState<Role>('OPERATIONS_ANALYST');
  const [merchantId, setMerchantId] = useState<string | null>('M_1001');
  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    return localStorage.getItem('trace_ai_api_key') || '';
  });

  const handleSetAiApiKey = (key: string) => {
    setAiApiKey(key);
    localStorage.setItem('trace_ai_api_key', key);
  };

  const value: AuthContextType = {
    role,
    merchantId,
    setRole,
    setMerchantId,
    aiApiKey,
    setAiApiKey: handleSetAiApiKey,
    // Capabilities
    canApproveHighValue: role === 'FINANCE_MANAGER',
    canModifySystem: role === 'FINANCE_MANAGER',
    canInvestigate: role !== 'AUDITOR',
    isReadOnly: role === 'AUDITOR',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
