'use client'

import { useState, useEffect } from 'react'
import { SignaturePad } from '@/components/signing/SignaturePad'
import { Loader2, CheckCircle2, FileSignature, AlertTriangle } from 'lucide-react'

interface ContractData {
  id: string
  title: string
  contractType: string
  status: string
  renderedHtml: string | null
  signedAt: string | null
  signedBy: string | null
  firmName: string | null
  retainerAmount: number | null
  hourlyRate: number | null
  depositionRate: number | null
  trialRate: number | null
}

interface PortalContractProps {
  token: string
  onSigned?: () => void
}

export function PortalContract({ token, onSigned }: PortalContractProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contract, setContract] = useState<ContractData | null>(null)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(`/api/portal/${token}/contract`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Failed to load contract')
          return
        }
        const data = await res.json()
        setContract(data.contract)
        if (data.contract.status === 'signed') {
          setSigned(true)
          setSignedAt(data.contract.signedAt)
        }
      } catch {
        setError('Failed to load contract')
      } finally {
        setLoading(false)
      }
    }
    fetchContract()
  }, [token])

  async function handleSign(signatureData: string, signerName: string) {
    try {
      const res = await fetch(`/api/portal/${token}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData, signerName, agreed: true }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to sign contract')
      }

      const data = await res.json()
      setSigned(true)
      setSignedAt(data.signedAt)
      onSigned?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign contract')
      throw err // re-throw so SignaturePad can handle loading state
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E1F35]" />
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (!contract) return null

  return (
    <div className="space-y-6">
      {/* Contract header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#0E1F35]">{contract.title}</h3>
          {contract.firmName && (
            <p className="text-sm text-gray-500 mt-1">{contract.firmName}</p>
          )}
        </div>
        {signed ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Signed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
            <FileSignature className="h-4 w-4" />
            Awaiting Signature
          </span>
        )}
      </div>

      {/* Signed confirmation */}
      {signed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-emerald-800 mb-1">
            Contract Successfully Signed
          </h4>
          <p className="text-sm text-emerald-600">
            {contract.signedBy && `Signed by ${contract.signedBy}`}
            {signedAt && ` on ${new Date(signedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}`}
          </p>
        </div>
      )}

      {/* Contract document */}
      {contract.renderedHtml && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
            Retention Agreement
          </div>
          <div
            className="p-8 bg-white prose prose-sm max-w-none"
            style={{ fontFamily: 'Georgia, serif' }}
            dangerouslySetInnerHTML={{ __html: contract.renderedHtml }}
          />
        </div>
      )}

      {/* Signature pad (only if not yet signed) */}
      {!signed && (
        <div className="mt-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <SignaturePad
            onSign={handleSign}
            signerLabel="Attorney"
          />
        </div>
      )}
    </div>
  )
}
