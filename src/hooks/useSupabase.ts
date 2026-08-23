import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function usePayments() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['payments', merchantId],
    queryFn: async () => {
      let query = supabase.from('payments').select('*, orders(receipt)');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('created_at', { ascending: false }).limit(100);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useRefunds() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['refunds', merchantId],
    queryFn: async () => {
      let query = supabase.from('refunds').select('*, payments(order_id)');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('created_at', { ascending: false }).limit(100);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSettlements() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['settlements', merchantId],
    queryFn: async () => {
      let query = supabase.from('settlements').select('*');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('settlement_period_end', { ascending: false }).limit(100);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useDisputes() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['disputes', merchantId],
    queryFn: async () => {
      let query = supabase.from('disputes').select('*, payments(order_id)');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('created_at', { ascending: false }).limit(100);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useIncidents() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['incidents', merchantId],
    queryFn: async () => {
      let query = supabase.from('incidents').select('*');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('detected_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useExceptions() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['exceptions', merchantId],
    queryFn: async () => {
      let query = supabase.from('exceptions').select('*');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('detected_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMerchantHealth() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['merchant_health', merchantId],
    queryFn: async () => {
      let query = supabase.from('merchant_health').select('*, merchants(business_name)');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAuditLogs() {
  const { merchantId, role } = useAuth();
  
  return useQuery({
    queryKey: ['audit_logs', merchantId, role],
    queryFn: async () => {
      let query = supabase.from('audit_logs').select('*');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('timestamp', { ascending: false }).limit(100);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvestigations() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['investigations', merchantId],
    queryFn: async () => {
      let query = supabase.from('investigations').select('*');
      if (merchantId) query = query.eq('merchant_id', merchantId);
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkflowStats() {
  const { merchantId } = useAuth();
  
  return useQuery({
    queryKey: ['workflow_stats', merchantId],
    queryFn: async () => {
      const getCount = async (table: string, filter?: { column: string, value: string }) => {
        let query = supabase.from(table).select('count', { count: 'exact', head: true });
        if (merchantId) query = query.eq('merchant_id', merchantId);
        if (filter) query = query.eq(filter.column, filter.value);
        const { count } = await query;
        return count || 0;
      };

      const [
        payments, settlements, refunds,
        exceptions, investigations,
        needsReview, resolved
      ] = await Promise.all([
        getCount('payments'),
        getCount('settlements'),
        getCount('refunds'),
        getCount('exceptions'),
        getCount('investigations'),
        getCount('exceptions', { column: 'status', value: 'NEEDS_REVIEW' }),
        getCount('exceptions', { column: 'status', value: 'RESOLVED' })
      ]);

      return {
        data: payments + settlements + refunds,
        detected: exceptions + Math.floor(exceptions * 0.5),
        exceptions,
        investigations,
        review: needsReview,
        resolved
      };
    },
  });
}
