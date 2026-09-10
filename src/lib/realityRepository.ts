import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type RealityCoverageState = 'SUPPORTED' | 'PARTIAL' | 'MISSING' | 'NOT_APPLICABLE'

export interface EconomyRealityCoverageRow {
  domain_code: string
  domain_group: string
  label: string
  coverage_state: RealityCoverageState
  represented_count: number
  expected_count: number | null
  coverage_ratio: number | null
  summary: string
  why_it_matters: string
  evidence_to_produce: string
  frontend_surface: string
  source_objects: string[]
  priority_rank: number
}

export async function listEconomyRealityCoverage(): Promise<EconomyRealityCoverageRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('economy_reality_coverage_v')
    .select('*')
    .order('priority_rank', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as EconomyRealityCoverageRow[]
}
