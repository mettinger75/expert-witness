'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { SharedView } from './SharedView'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Lock, Clock } from 'lucide-react'

interface LinkData {
  id: string
  entity_type: 'report' | 'contract' | 'invoice'
  permission: 'view' | 'edit' | 'sign'
  recipient_name: string | null
  expires_at: string
  original_html: string | null
  edited_html: string | null
  editor_notes: string | null
}

export default function SharedPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresPin, setRequiresPin] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [linkData, setLinkData] = useState<LinkData | null>(null)
  const [entityData, setEntityData] = useState<Record<string, unknown> | null>(null)

  async function validateToken(pinValue?: string) {
    setLoading(true)
    setError(null)
    setPinError(false)

    try {
      const url = new URL(`/api/shared-links/${token}`, window.location.origin)
      if (pinValue) url.searchParams.set('pin', pinValue)

      const res = await fetch(url.toString())

      if (res.status === 401) {
        const data = await res.json()
        if (data.requiresPin) {
          setRequiresPin(true)
          if (pinValue) setPinError(true)
          setLoading(false)
          return
        }
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'This link is invalid or has expired')
        setLoading(false)
        return
      }

      const { link, entity } = await res.json()
      setLinkData(link)
      setEntityData(entity)
      setRequiresPin(false)
    } catch {
      setError('Failed to load shared document')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    validateToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length >= 4) {
      validateToken(pin)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground mt-4">Loading shared document...</p>
      </div>
    )
  }

  // PIN entry
  if (requiresPin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 max-w-sm mx-auto">
        <div className="p-4 rounded-full bg-[#0E1F35]/10 mb-4">
          <Lock className="h-8 w-8 text-[#0E1F35]" />
        </div>
        <h1 className="text-lg font-semibold mb-2">PIN Required</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          This document is protected. Please enter the PIN to continue.
        </p>
        <form onSubmit={handlePinSubmit} className="w-full space-y-3">
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter PIN"
            maxLength={6}
            className={`text-center text-lg tracking-widest ${pinError ? 'border-red-500' : ''}`}
            autoFocus
          />
          {pinError && (
            <p className="text-xs text-red-500 text-center">Invalid PIN. Please try again.</p>
          )}
          <Button type="submit" className="w-full" disabled={pin.length < 4}>
            Continue
          </Button>
        </form>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="p-4 rounded-full bg-red-100 mb-4">
          {error.includes('expired') ? (
            <Clock className="h-8 w-8 text-red-500" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-500" />
          )}
        </div>
        <h1 className="text-lg font-semibold mb-2">Unable to Access Document</h1>
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </div>
    )
  }

  // Shared view
  if (linkData && entityData) {
    return (
      <SharedView
        token={token}
        link={linkData}
        entity={entityData}
      />
    )
  }

  return null
}
