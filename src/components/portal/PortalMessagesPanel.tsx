'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/formatters'
import { authHeaders } from '@/lib/api-client'

interface PortalMessage {
  id: string
  portal_invite_id: string
  case_id: string
  sender_type: 'attorney' | 'provider'
  sender_name: string
  content: string
  is_read: boolean
  created_at: string
  portal_invites?: {
    contacts?: {
      first_name: string
      last_name: string
    }
  }
}

interface PortalMessagesPanelProps {
  caseId: string
}

export function PortalMessagesPanel({ caseId }: PortalMessagesPanelProps) {
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [portalInviteId, setPortalInviteId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/portal/messages?caseId=${caseId}`, {
        headers: { ...(await authHeaders()) },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { messages: msgs } = await res.json()
      setMessages(msgs || [])
      // Get the first invite ID for sending
      if (msgs && msgs.length > 0 && msgs[0].portal_invite_id) {
        setPortalInviteId(msgs[0].portal_invite_id)
      }
    } catch {
      // Silent fail on refresh
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [caseId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Also fetch portal invites to get an invite ID for sending
  useEffect(() => {
    if (!portalInviteId) {
      authHeaders()
        .then(h => fetch(`/api/portal?caseId=${caseId}`, { headers: { ...h } }))
        .then(res => res.json())
        .then(data => {
          if (data.invites && data.invites.length > 0) {
            setPortalInviteId(data.invites[0].id)
          }
        })
        .catch(() => {})
    }
  }, [caseId, portalInviteId])

  async function handleSend() {
    if (!newMessage.trim() || !portalInviteId) return
    setSending(true)
    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          portalInviteId,
          caseId,
          content: newMessage.trim(),
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setNewMessage('')
      await fetchMessages()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#DFC06A]" />
            Portal Messages
            {messages.filter(m => m.sender_type === 'attorney' && !m.is_read).length > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                {messages.filter(m => m.sender_type === 'attorney' && !m.is_read).length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { setLoading(true); fetchMessages() }}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No portal messages yet.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg text-sm ${
                  msg.sender_type === 'provider'
                    ? 'bg-[#0E1F35]/5 border-l-2 border-[#0E1F35]'
                    : 'bg-[#DFC06A]/5 border-l-2 border-[#DFC06A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-xs">
                    {msg.sender_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Reply input */}
        {portalInviteId && (
          <div className="flex gap-2 pt-2 border-t">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DFC06A]/50 focus:border-[#DFC06A]"
            />
            <Button size="sm" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
