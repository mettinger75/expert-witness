import type { SupabaseClient } from '@supabase/supabase-js'

interface SignContractParams {
  contractId: string
  signatureData: string
  signerName: string
  ip: string | null
  userAgent: string | null
}

/**
 * Shared contract signing logic used by both portal signing and shared-link signing routes.
 * Updates the contract record with signature data and marks it as signed.
 */
export async function signContract(
  supabase: SupabaseClient,
  { contractId, signatureData, signerName, ip, userAgent }: SignContractParams
) {
  const signedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('contracts')
    .update({
      signature_data: signatureData,
      signed_at: signedAt,
      signed_by: signerName,
      signature_ip: ip,
      signature_timestamp: signedAt,
      signature_user_agent: userAgent,
      status: 'signed',
      updated_at: signedAt,
    })
    .eq('id', contractId)

  if (updateError) {
    console.error('Contract signature update error:', updateError)
    throw new Error('Failed to record signature')
  }

  return { signedAt }
}
