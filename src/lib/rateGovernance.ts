import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

async function requireAdmin() {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Sign in before changing rate authority.')

  const { data: membership, error: membershipError } = await client
    .from('app_members')
    .select('role,active')
    .eq('user_id', userId)
    .maybeSingle()
  if (membershipError) throw membershipError
  if (!membership?.active || membership.role !== 'ADMIN') throw new Error('Admin authority is required to approve or retire reusable cost rates.')
  return { client, userId }
}

export async function approveEconomicRate(rateId: string) {
  const { client, userId } = await requireAdmin()
  const { data: rate, error: rateError } = await client
    .from('economic_rate_profiles')
    .select('id,status,profile_key,version_no')
    .eq('id', rateId)
    .single()
  if (rateError) throw rateError
  if (rate.status !== 'DRAFT') throw new Error('Only a draft rate can be approved.')

  const { data, error } = await client
    .from('economic_rate_profiles')
    .update({
      status: 'APPROVED',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', rateId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function retireEconomicRate(rateId: string) {
  const { client } = await requireAdmin()
  const { data: rate, error: rateError } = await client
    .from('economic_rate_profiles')
    .select('id,status')
    .eq('id', rateId)
    .single()
  if (rateError) throw rateError
  if (rate.status !== 'APPROVED') throw new Error('Only an approved rate can be retired.')

  const { data, error } = await client
    .from('economic_rate_profiles')
    .update({ status: 'RETIRED' })
    .eq('id', rateId)
    .select('*')
    .single()
  if (error) throw error
  return data
}
