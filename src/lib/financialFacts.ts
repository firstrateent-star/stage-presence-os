import { supabase } from './supabase'

export type FinancialFactType =
  | 'QUOTE_TOTAL'
  | 'CONTRACT_TOTAL'
  | 'DEPOSIT_REQUIRED'
  | 'DEPOSIT_RECEIVED'
  | 'INVOICE_TOTAL'
  | 'AMOUNT_INVOICED'
  | 'AMOUNT_COLLECTED'
  | 'DIRECT_COST_ESTIMATE'
  | 'DIRECT_COST_ACTUAL'
  | 'REFUND'
  | 'OTHER'

export type FinancialFactCertainty = 'VERIFIED' | 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'CONFLICTING'

export interface EngagementFinancialFact {
  id: string
  engagement_id: string
  fact_type: FinancialFactType
  amount: number
  currency: string
  certainty_state: FinancialFactCertainty
  effective_date: string | null
  source_key: string | null
  source_artifact_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function listEngagementFinancialFacts(): Promise<EngagementFinancialFact[]> {
  if (!supabase) throw new Error('Backend is not configured.')
  const { data, error } = await supabase
    .from('engagement_financial_facts')
    .select('id,engagement_id,fact_type,amount,currency,certainty_state,effective_date,source_key,source_artifact_id,notes,created_at,updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EngagementFinancialFact[]
}
