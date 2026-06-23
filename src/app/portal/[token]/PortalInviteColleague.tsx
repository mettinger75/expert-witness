'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { UserPlus, Mail, Check, Loader2 } from 'lucide-react'

interface PortalInviteColleagueProps {
  token: string
  caseName: string
}

const ROLE_OPTIONS = [
  { value: 'co_counsel', label: 'Co-counsel' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'co_expert', label: 'Co-expert' },
  { value: 'other', label: 'Other' },
]

interface InvitedPerson {
  name: string
  email: string
}

export function PortalInviteColleague({ token, caseName }: PortalInviteColleagueProps) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('co_counsel')
  const [submitting, setSubmitting] = useState(false)
  const [invited, setInvited] = useState<InvitedPerson[]>([])

  function reset() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setRole('co_counsel')
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = firstName.trim().length > 0 && emailValid && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/${token}/add-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          role,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not send the invitation')
        return
      }
      const name = `${firstName.trim()} ${lastName.trim()}`.trim()
      setInvited((prev) => [...prev, { name, email: email.trim() }])
      toast.success(`Invitation sent to ${name || email.trim()}`)
      reset()
      setOpen(false)
    } catch {
      toast.error('Could not send the invitation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#0E1F35] flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#DFC06A]" />
            Add someone to this case
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Invite co-counsel, a paralegal, or anyone else on your team. They&apos;ll
            get their own secure link to this portal by email — no account needed.
          </p>

          {invited.length > 0 && (
            <div className="mt-4 space-y-2">
              {invited.map((p, i) => (
                <div
                  key={`${p.email}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                >
                  <Check className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{p.name || p.email}</span>
                  <span className="text-emerald-600">— invitation sent</span>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="mt-4 border-[#0E1F35]/20 text-[#0E1F35] hover:bg-[#0E1F35]/5"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite a colleague
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { if (!submitting) setOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a colleague</DialogTitle>
            <DialogDescription>
              They&apos;ll receive a secure link to the portal for{' '}
              <strong>{caseName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  First name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Last name
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@lawfirm.com"
              />
              {email.length > 0 && !emailValid && (
                <p className="mt-1 text-xs text-red-600">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Role on this case
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DFC06A] focus:border-transparent"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="flex items-start gap-2 text-xs text-gray-500">
              <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              The invitation is sent from Dr. Ettinger&apos;s office, and he&apos;s
              copied on every invite.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
