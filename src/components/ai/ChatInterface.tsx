'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChatMessage } from '@/components/ai/ChatMessage'
import { ChatInput } from '@/components/ai/ChatInput'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authHeaders } from '@/lib/api-client'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  model?: string
}

interface ChatInterfaceProps {
  caseId?: string
  conversationType?: string
  initialMessages?: Message[]
  onMessageComplete?: (userMsg: string, assistantMsg: string) => void
  className?: string
}

const AI_MODELS = [
  { value: 'fast', label: 'Claude Haiku (Fast)' },
  { value: 'standard', label: 'Claude Sonnet (Standard)' },
  { value: 'advanced', label: 'Claude Opus (Advanced)' },
]

export function ChatInterface({
  caseId,
  conversationType = 'general',
  initialMessages,
  onMessageComplete,
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('standard')
  const [tokenUsage, setTokenUsage] = useState<{ input: number; output: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sync initialMessages when they change (e.g. conversation switch)
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages)
    }
  }, [initialMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const assistantId = `assistant-${Date.now()}`
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        model: AI_MODELS.find((m) => m.value === selectedModel)?.label,
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            modelTier: selectedModel,
            caseId,
            conversationType,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get response')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          let fullContent = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) {
                    fullContent += parsed.content
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? {
                              ...m,
                              content: fullContent,
                              timestamp: new Date().toLocaleTimeString(),
                            }
                          : m
                      )
                    )
                  }
                  if (parsed.usage) {
                    setTokenUsage(parsed.usage)
                  }
                } catch {
                  // Non-JSON line, skip
                }
              }
            }
          }

          // Notify parent that the exchange is complete
          if (onMessageComplete && fullContent) {
            onMessageComplete(content, fullContent)
          }
        }
      } catch (error) {
        console.error('Chat error:', error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'Sorry, I encountered an error. Please try again.',
                  timestamp: new Date().toLocaleTimeString(),
                }
              : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, selectedModel, caseId, conversationType, onMessageComplete]
  )

  return (
    <Card className={cn('flex flex-col', className || 'h-[600px]')}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          {tokenUsage && (
            <span className="text-xs text-muted-foreground">
              Tokens: {tokenUsage.input + tokenUsage.output}
            </span>
          )}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value} className="text-xs">
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <h3 className="text-sm font-semibold">Start a conversation</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Ask questions about cases, get help with report drafting, research medical literature, or analyze documents.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        placeholder={
          caseId
            ? 'Ask about this case...'
            : 'Ask a question...'
        }
      />
    </Card>
  )
}
