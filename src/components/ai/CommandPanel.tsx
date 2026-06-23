'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Bot, User, Loader2, Terminal } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function CommandPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMessage: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to reach the AI command endpoint.' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(201, 168, 76, 0.10)' }}
          >
            <Terminal className="h-4 w-4" style={{ color: '#DFC06A' }} />
          </div>
          <div>
            <CardTitle className="text-base">AI Command Center</CardTitle>
            <p className="text-xs" style={{ color: '#8892A2' }}>
              Natural language commands with database access
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 mb-4" style={{ color: '#D8DCE3' }} />
            <p className="text-sm font-medium" style={{ color: '#8892A2' }}>
              Ask me anything about your cases
            </p>
            <p className="text-xs mt-1" style={{ color: '#B0B8C5' }}>
              I can create cases, contacts, milestones, run queries, and sync to Control Center.
            </p>
            <div className="mt-4 space-y-1.5">
              {[
                'Create a new case for Smith v. Memorial Hospital',
                'Show me all active cases',
                'What deadlines are coming up this month?',
                'Sync everything to Control Center',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="block w-full text-left text-xs px-3 py-1.5 rounded-md transition-colors"
                  style={{ color: '#8892A2', border: '1px solid #D8DCE3' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(201, 168, 76, 0.05)'
                    e.currentTarget.style.borderColor = '#DFC06A'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = '#D8DCE3'
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: 'rgba(201, 168, 76, 0.10)' }}
              >
                <Bot className="h-4 w-4" style={{ color: '#DFC06A' }} />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#091525] text-white'
                  : 'bg-[#F8F9FB] text-[#1F2937]'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: '#091525' }}
              >
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(201, 168, 76, 0.10)' }}
            >
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#DFC06A' }} />
            </div>
            <div className="bg-[#F8F9FB] rounded-lg px-3 py-2 text-sm" style={{ color: '#8892A2' }}>
              Processing command...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command... (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none rounded-md border border-[#D8DCE3] px-3 py-2 text-sm outline-none focus:border-[#DFC06A] focus:ring-[3px] focus:ring-[rgba(201,168,76,0.15)]"
            rows={1}
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
