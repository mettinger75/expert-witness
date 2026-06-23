'use client'

import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, FileSignature, Loader2 } from 'lucide-react'

interface SignaturePadProps {
  onSign: (signatureData: string, signerName: string) => Promise<void>
  signerLabel?: string
}

export function SignaturePad({ onSign, signerLabel = 'Signer' }: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas>(null)
  const [signerName, setSignerName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  function handleClear() {
    canvasRef.current?.clear()
    setHasSignature(false)
  }

  function handleEnd() {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      setHasSignature(true)
    }
  }

  async function handleSubmit() {
    if (!canvasRef.current || canvasRef.current.isEmpty() || !signerName.trim() || !agreed) return

    setSigning(true)
    try {
      const signatureData = canvasRef.current.getTrimmedCanvas().toDataURL('image/png')
      await onSign(signatureData, signerName.trim())
    } finally {
      setSigning(false)
    }
  }

  const canSubmit = hasSignature && signerName.trim() && agreed && !signing

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileSignature className="h-5 w-5 text-[#DFC06A]" />
        <h3 className="font-semibold text-base" style={{ color: '#0E1F35' }}>
          Electronic Signature
        </h3>
      </div>

      {/* Signer name */}
      <div className="mb-4">
        <label className="text-sm font-medium text-muted-foreground mb-1 block">
          {signerLabel}&apos;s Full Name
        </label>
        <Input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Enter your full name"
          className="max-w-sm"
        />
      </div>

      {/* Signature canvas */}
      <div className="mb-4">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Sign Below
        </label>
        <div className="border-2 border-dashed border-neutral-300 rounded-lg overflow-hidden bg-white relative">
          <SignatureCanvas
            ref={canvasRef}
            penColor="#0E1F35"
            canvasProps={{
              width: 600,
              height: 200,
              className: 'signature-canvas w-full',
              style: { maxWidth: '100%', height: '200px' },
            }}
            onEnd={handleEnd}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-neutral-300 text-sm italic">Sign here</span>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-muted-foreground"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Agreement checkbox */}
      <div className="flex items-start gap-3 mb-6">
        <Checkbox
          id="agree"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-0.5"
        />
        <label htmlFor="agree" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
          I acknowledge that this electronic signature has the same legal effect as a handwritten signature,
          and I agree to the terms set forth in this document.
        </label>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full"
        size="lg"
      >
        {signing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileSignature className="h-4 w-4 mr-2" />
        )}
        Sign Document
      </Button>
    </div>
  )
}
