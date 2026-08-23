import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

export function useInvestigation(type: string, id: string) {
  const { merchantId, aiApiKey } = useAuth();

  return useQuery({
    queryKey: ['investigation', type, id, merchantId],
    queryFn: async () => {
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-AI-Key': aiApiKey
        },
        body: JSON.stringify({
          query: `Investigate ${type} ${id}`,
          targetType: type,
          targetId: id,
          merchantId: merchantId || 'TEST_MERCHANT'
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: false, // Must be triggered manually
    retry: false,
  });
}

export function useGraph(type: string, id: string) {
  return useQuery({
    queryKey: ['graph', type, id],
    queryFn: async () => {
      const res = await fetch(`/api/graph/${type}/${id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

export function useWorkflowAction() {
  const { role, merchantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, entityType, entityId, reason }: any) => {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          entityType,
          entityId,
          role,
          actor: 'Current User', // Mocked user
          merchantId: merchantId || 'TEST_MERCHANT',
          reason
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    }
  });
}
