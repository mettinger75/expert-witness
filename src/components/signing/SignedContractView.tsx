'use client'

import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

interface SignedContractViewProps {
  html: string
  signatureData: string
  signedBy: string
  signedAt: string
}

export function SignedContractView({
  html,
  signatureData,
  signedBy,
  signedAt,
}: SignedContractViewProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Signed
        </Badge>
        <span className="text-sm text-muted-foreground">
          by {signedBy} on{' '}
          {new Date(signedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* Contract content */}
        <div
          className="p-8"
          style={{ fontFamily: 'Georgia, serif' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Signature block */}
        <div className="border-t p-8 bg-neutral-50">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Electronic Signature
          </div>
          <div className="flex items-end gap-6">
            <div>
              <img
                src={signatureData}
                alt="Signature"
                className="max-h-20 border-b-2 border-[#0E1F35] pb-1 mb-1"
              />
              <div className="text-sm font-semibold" style={{ color: '#0E1F35' }}>
                {signedBy}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(signedAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
