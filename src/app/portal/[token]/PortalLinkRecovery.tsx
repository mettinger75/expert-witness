'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PortalLinkRecovery() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const valid = EMAIL_RE.test(email.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || state === 'sending') return
    setState('sending')
    try {
      const res = await fetch('/api/portal/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage(data.message || 'If that email is on a case portal, we just sent your link.')
        setState('sent')
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.')
        setState('error')
      }
    } catch {
      setMessage('Something went wrong. Please try again.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-left">
        <div className="flex items-center gap-2 text-emerald-800 font-medium">
          <CheckCircle2 className="h-5 w-5" />
          Check your inbox
        </div>
        <p className="mt-2 text-sm text-emerald-700">{message}</p>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 text-left">
      <p className="text-sm font-medium text-[#0E1F35]">Lost your link?</p>
      <p className="mt-1 text-sm text-gray-600">
        Enter the email address you were contacted at and we&apos;ll send your
        secure portal link again.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (state === 'error') setState('idle')
          }}
          placeholder="you@lawfirm.com"
          className="flex-1"
          aria-label="Your email address"
        />
        <Button
          type="submit"
          disabled={!valid || state === 'sending'}
          className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 shrink-0"
        >
          {state === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Resend my link
            </>
          )}
        </Button>
      </form>
      {state === 'error' && (
        <p className="mt-2 text-sm text-red-600">{message}</p>
      )}
    </div>
  )
}
