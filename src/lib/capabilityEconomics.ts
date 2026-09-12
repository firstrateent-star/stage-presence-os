import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export interface CapabilityEconomicRow {
  resource_id: string
  resource_name: string
  resource_category: string
  sourcing_model: string
  library_quantity: number | null
  quantity_state: string
  reference_price: number | null
  price_state: string
  active_commitment_count: number
  active_committed_quantity: number | null
  actual_usage_count: number
  actual_usage_quantity: number | null
  represented_committed_revenue: number | null
  resource_linked_actual_cost: number | null
  ownership_state: string | null
  asset_as_of: string | null
  acquisition_cost_total: number | null
  current_value_estimate: number | null
  replacement_cost_total: number | null
  financing_balance: number | null
  annual_maintenance_estimate: number | null
}

type ResourceBase = {
  id: string
  name: string
  category: string
  sourcing_model: string
  quantity: number | null
  quantity_state: string
  reference_price: number | null
  price_state: string
}

type ResourceEconomy = {
  resource_id: string
  as_of: string
  ownership_state: string
  acquisition_cost_total: number | null
  current_value_estimate: number | null
  replacement_cost_total: number | null
  financing_balance: number | null
  annual_maintenance_estimate: number | null
}

export async function listCapabilityEconomics(): Promise<CapabilityEconomicRow[]> {
  const client = requireClient()
  const [resourcesResult, economyResult, commitmentsResult, usageResult, revenueResult, costsResult] = await Promise.all([
    client.from('resources').select('id,name,category,sourcing_model,quantity,quantity_state,reference_price,price_state').eq('active', true).order('category').order('name'),
    client.from('resource_economy_current_v').select('resource_id,as_of,ownership_state,acquisition_cost_total,current_value_estimate,replacement_cost_total,financing_balance,annual_maintenance_estimate'),
    client.from('resource_commitment_current_v').select('resource_id,commitment_state,quantity').in('commitment_state', ['TENTATIVE', 'CONFIRMED']),
    client.from('resource_usage').select('resource_id,usage_state,quantity'),
    client.from('engagement_revenue_sources_v').select('resource_id,effective_line_total,committed_source').eq('committed_source', true).not('resource_id', 'is', null),
    client.from('engagement_cost_breakdown_v').select('resource_id,amount,cost_state').eq('cost_state', 'ACTUAL').not('resource_id', 'is', null),
  ])

  for (const result of [resourcesResult, economyResult, commitmentsResult, usageResult, revenueResult, costsResult]) {
    if (result.error) throw result.error
  }

  const economy = new Map<string, ResourceEconomy>()
  for (const row of (economyResult.data ?? []) as ResourceEconomy[]) economy.set(row.resource_id, row)

  const commitments = new Map<string, { count: number; quantity: number | null }>()
  for (const row of commitmentsResult.data ?? []) {
    const key = row.resource_id as string
    const current = commitments.get(key) ?? { count: 0, quantity: null }
    current.count += 1
    if (row.quantity != null) current.quantity = (current.quantity ?? 0) + Number(row.quantity)
    commitments.set(key, current)
  }

  const usage = new Map<string, { count: number; quantity: number | null }>()
  for (const row of usageResult.data ?? []) {
    const key = row.resource_id as string
    const current = usage.get(key) ?? { count: 0, quantity: null }
    current.count += 1
    if (row.quantity != null) current.quantity = (current.quantity ?? 0) + Number(row.quantity)
    usage.set(key, current)
  }

  const revenue = new Map<string, number>()
  for (const row of revenueResult.data ?? []) {
    if (!row.resource_id || row.effective_line_total == null) continue
    revenue.set(row.resource_id as string, (revenue.get(row.resource_id as string) ?? 0) + Number(row.effective_line_total))
  }

  const costs = new Map<string, number>()
  for (const row of costsResult.data ?? []) {
    if (!row.resource_id || row.amount == null) continue
    costs.set(row.resource_id as string, (costs.get(row.resource_id as string) ?? 0) + Number(row.amount))
  }

  return ((resourcesResult.data ?? []) as ResourceBase[]).map(resource => {
    const asset = economy.get(resource.id)
    const committed = commitments.get(resource.id)
    const used = usage.get(resource.id)
    return {
      resource_id: resource.id,
      resource_name: resource.name,
      resource_category: resource.category,
      sourcing_model: resource.sourcing_model,
      library_quantity: resource.quantity,
      quantity_state: resource.quantity_state,
      reference_price: resource.reference_price,
      price_state: resource.price_state,
      active_commitment_count: committed?.count ?? 0,
      active_committed_quantity: committed?.quantity ?? null,
      actual_usage_count: used?.count ?? 0,
      actual_usage_quantity: used?.quantity ?? null,
      represented_committed_revenue: revenue.has(resource.id) ? revenue.get(resource.id)! : null,
      resource_linked_actual_cost: costs.has(resource.id) ? costs.get(resource.id)! : null,
      ownership_state: asset?.ownership_state ?? null,
      asset_as_of: asset?.as_of ?? null,
      acquisition_cost_total: asset?.acquisition_cost_total ?? null,
      current_value_estimate: asset?.current_value_estimate ?? null,
      replacement_cost_total: asset?.replacement_cost_total ?? null,
      financing_balance: asset?.financing_balance ?? null,
      annual_maintenance_estimate: asset?.annual_maintenance_estimate ?? null,
    }
  })
}
