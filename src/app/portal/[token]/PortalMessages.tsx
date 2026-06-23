'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Send,
  RefreshCw,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  portal_invite_id: string
  case_id: string
  sender_type: 'provider' | 'attorney'
  sender_name: string
  content: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

interface PortalMessagesProps {
  token: string
  onUnreadChange: (count: number) => void
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function PortalMessages({ token, onUnreadChange }: PortalMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchMessages = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true)
      try {
        const res = await fetch(`/api/portal/${token}/messages`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data = await res.json()
        setMessages(data.messages || [])
        // Since the API marks provider messages as read, set unread to 0
        onUnreadChange(0)
      } catch {
        toast.error('Failed to load messages')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token, onUnreadChange]
  )

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!loading) {
      scrollToBottom()
    }
  }, [messages, loading, scrollToBottom])

  async function handleSend() {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/portal/${token}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send message')
      }

      const data = await res.json()
      setMessages((prev) => [...prev, data.message])
      setNewMessage('')
      toast.success('Message sent')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send message'
      )
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#0E1F35]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">
          Secure Messages with Mark Ettinger, M.D.
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMessages(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Messages area */}
      <Card className="flex-1 overflow-hidden py-0">
        <CardContent className="h-full overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                No messages yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Send a message to start the conversation.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'attorney' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    msg.sender_type === 'provider'
                      ? 'bg-white border-l-4 border-l-[#0E1F35] border border-gray-100 shadow-sm'
                      : 'bg-white border-l-4 border-l-[#DFC06A] border border-gray-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#0E1F35]">
                      {msg.sender_name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Message input */}
      <div className="mt-4 flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          className="min-h-[44px] max-h-[120px] resize-none"
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 shrink-0 self-end"
          size="default"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
