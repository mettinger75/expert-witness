'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { MessageSquare, Send, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { authHeaders } from '@/lib/api-client'

interface PortalMessage {
  id: string
  portal_invite_id: string
  case_id: string
  sender_type: 'attorney' | 'provider'
  sender_name: string | null
  content: string
  is_read: boolean | null
  read_at: string | null
  created_at: string
}

interface InvitePayload {
  id: string
  token: string | null
  can_message: boolean | null
  contacts: { first_name: string | null; last_name: string | null; email: string | null } | null
}

const POLL_INTERVAL_MS = 15_000

export default function CaseMessagesPage() {
  const params = useParams()
  const caseId = params.id as string

  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [invite, setInvite] = useState<InvitePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/portal/messages?caseId=${caseId}`, {
        headers: { ...(await authHeaders()) },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load messages')
      setMessages(data.messages || [])
      setInvite(data.invite || null)
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : 'Failed to load messages')
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    load()
    const t = setInterval(() => load(true), POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const content = draft.trim()
    if (!content) return
    if (!invite) {
      toast.error('No active portal invite for this case')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ portalInviteId: invite.id, caseId, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setDraft('')
      await load(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!invite) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No portal invite for this case"
        description="Create a portal invite from the case overview to enable messaging with the attorney."
      />
    )
  }

  const contact = invite.contacts
  const contactName = contact ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() : 'Counsel'

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[480px] bg-white rounded-xl border border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0E1F35]">Conversation with {contactName}</p>
          {contact?.email && <p className="text-xs text-gray-500">{contact.email}</p>}
        </div>
        {invite.token && (
          <Button variant="ghost" size="sm" asChild>
            <a href={`/portal/${invite.token}`} target="_blank" rel="noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View their portal
            </a>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400 text-center max-w-sm mx-auto">
            No messages yet. Send the first one — it will arrive in {contactName}&rsquo;s portal and copy to your email.
          </div>
        ) : (
          messages.map((m) => {
            const isProvider = m.sender_type === 'provider'
            return (
              <div key={m.id} className={cn('flex', isProvider ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
                  isProvider ? 'bg-[#0E1F35] text-white' : 'bg-white text-[#0E1F35] border border-gray-200',
                )}>
                  <p className={cn('text-[11px] mb-1 opacity-70', isProvider ? 'text-[#DFC06A]' : 'text-gray-500')}>
                    {isProvider ? 'You' : (m.sender_name || contactName)} · {formatDateTime(m.created_at)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-3 border-t border-gray-100 bg-white">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your reply..."
          rows={3}
          disabled={sending}
          className="resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">⌘/Ctrl + Enter to send · A copy will land in your email</p>
          <Button onClick={handleSend} disabled={sending || !draft.trim()} size="sm">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
