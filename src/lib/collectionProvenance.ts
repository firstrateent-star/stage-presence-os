import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type PaymentSourceType = 'MANUAL' | 'IMPORT' | 'PROCESSOR' | 'ACCOUNTING' | 'SYSTEM' | 'OTHER'
export type PaymentCertainty = 'VERIFIED' | 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'CONFLICTING'

export interface PaymentProvenanceRow {
  id: string
  commercial_document_id: string
  payment_date: string | null
  method: string | null
  status: string | null
  charged_amount: number | null
  applied_amount: number | null
  external_payment_id: string | null
  source_type: PaymentSourceType
  certainty_state: PaymentCertainty
  notes: string | null
  created_at: string
  commercial_documents?: {
    engagement_id: string | null
    document_type: string | null
    external_id: string | null
    engagements?: {
      engagement_number: string | null
      name: string | null
    } | null
  } | null
}

export interface VerifyPaymentInput {
  paymentId: string
  sourceType: 'ACCOUNTING' | 'PROCESSOR'
  externalPaymentId?: string | null
  verificationNote?: string | null
}

export async function listPaymentProvenance(): Promise<PaymentProvenanceRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('commercial_payments')
    .select(`
      id,
      commercial_document_id,
      payment_date,
      method,
      status,
      charged_amount,
      applied_amount,
      external_payment_id,
      source_type,
      certainty_state,
      notes,
      created_at,
      commercial_documents!inner(
        engagement_id,
        document_type,
        external_id,
        engagements!inner(
          engagement_number,
          name
        )
      )
    `)
    .order('payment_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as PaymentProvenanceRow[]
}

export async function verifyPaymentEvidence(input: VerifyPaymentInput) {
  const client = requireClient()
  const patch: Record<string, unknown> = {
    source_type: input.sourceType,
    certainty_state: 'VERIFIED',
  }
  if (input.externalPaymentId?.trim()) patch.external_payment_id = input.externalPaymentId.trim()
  if (input.verificationNote?.trim()) patch.notes = input.verificationNote.trim()

  const { data, error } = await client
    .from('commercial_payments')
    .update(patch)
    .eq('id', input.paymentId)
    .select('id,source_type,certainty_state,external_payment_id,notes')
    .single()
  if (error) throw error
  return data
}
