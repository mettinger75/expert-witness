'use client'

import { cn } from '@/lib/utils'
import { User, Sparkles } from 'lucide-react'

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp?: string
    model?: string
  }
}

function formatMarkdown(text: string): React.ReactNode {
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g)

  return parts.map((part, i) => {
    // Code blocks
    if (part.startsWith('```') && part.endsWith('```')) {
      const content = part.slice(3, -3)
      const firstLine = content.indexOf('\n')
      const code = firstLine >= 0 ? content.slice(firstLine + 1) : content
      return (
        <pre key={i} className="bg-muted rounded-md p-3 overflow-x-auto my-2 text-xs">
          <code>{code}</code>
        </pre>
      )
    }

    // Inline formatting
    const lines = part.split('\n')
    return lines.map((line, j) => {
      // Process inline formatting
      let formatted: React.ReactNode = line

      // Bold
      if (line.includes('**')) {
        const boldParts = line.split(/\*\*(.*?)\*\*/g)
        formatted = boldParts.map((bp, k) =>
          k % 2 === 1 ? <strong key={k}>{bp}</strong> : bp
        )
      }

      // Italic (single *)
      if (typeof formatted === 'string' && formatted.includes('*')) {
        const italicParts = (formatted as string).split(/\*(.*?)\*/g)
        formatted = italicParts.map((ip, k) =>
          k % 2 === 1 ? <em key={k}>{ip}</em> : ip
        )
      }

      // Inline code
      if (typeof formatted === 'string' && formatted.includes('`')) {
        const codeParts = (formatted as string).split(/`(.*?)`/g)
        formatted = codeParts.map((cp, k) =>
          k % 2 === 1 ? (
            <code key={k} className="bg-muted px-1 py-0.5 rounded text-xs">
              {cp}
            </code>
          ) : (
            cp
          )
        )
      }

      // List items
      if (line.match(/^[-*]\s/)) {
        return (
          <li key={`${i}-${j}`} className="ml-4 list-disc">
            {typeof formatted === 'string' ? formatted.replace(/^[-*]\s/, '') : formatted}
          </li>
        )
      }

      // Numbered list
      if (line.match(/^\d+\.\s/)) {
        return (
          <li key={`${i}-${j}`} className="ml-4 list-decimal">
            {typeof formatted === 'string' ? formatted.replace(/^\d+\.\s/, '') : formatted}
          </li>
        )
      }

      return (
        <span key={`${i}-${j}`}>
          {formatted}
          {j < lines.length - 1 && <br />}
        </span>
      )
    })
  })
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) return null

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          'rounded-lg px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <div className="text-sm leading-relaxed">
          {formatMarkdown(message.content)}
        </div>
        {!isUser && (message.timestamp || message.model) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs opacity-60">
            {message.timestamp && <span>{message.timestamp}</span>}
            {message.model && <span>{message.model}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
