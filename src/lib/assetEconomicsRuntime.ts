import { supabase } from './supabase'

function client() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export interface AssetMeasurementPosition {
  resource_id: string
  resource_name: string
  category: string
  sourcing_model: string
  verified_quantity: number | null
  serviceable_quantity: number | null
  available_quantity_today: number | null
  capacity_state: string
  inventory_authority_state: string
  confirmed_reservation_count: number
  confirmed_engagement_count: number
  reserved_quantity_days: number
  usage_record_count: number
  usage_engagement_count: number
  actual_usage_quantity_total: number
  actual_usage_hours: number
  last_usage_at: string | null
  issue_count: number
  open_issue_count: number
  open_affected_quantity: number
  observed_downtime_days: number
  maintenance_estimated_cost: number
  maintenance_actual_cost: number
  supported_engagement_count: number
  commercial_line_revenue_supported: number
  engagement_revenue_supported: number
  contribution_supported_engagement_count: number
  contribution_supported: number
  utilization_evidence_state: string
  maintenance_evidence_state: string
  commercial_support_evidence_state: string
  capacity_pressure_observed: boolean
  maintenance_pressure_observed: boolean
  measurement_state: string
  evidence_gaps: string[]
}

export async function listAssetMeasurementPositions(): Promise<AssetMeasurementPosition[]> {
  const { data, error } = await client()
    .from('resource_asset_measurement_v')
    .select('*')
    .eq('sourcing_model', 'OWNED')
    .order('category')
    .order('resource_name')
  if (error) throw error
  return (data ?? []) as AssetMeasurementPosition[]
}
