'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Brain, ChevronDown, Sparkles,
  FileText, Clock, Users, Briefcase, ScrollText,
  Plus, MessageSquare,
} from 'lucide-react'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { useConversations, useCreateConversation } from '@/hooks/useConversations'
import { useMessages, useSendMessage } from '@/hooks/useMessages'

// Quick prompt suggestions
const quickPrompts = [
  'Analyze standard of care',
  'Summarize medical records',
  'Draft opinion section',
  'Generate timeline',
  'Review causation',
  'What documents have been uploaded?',
]

export default function CaseAIPage() {
  const params = useParams()
  const caseId = params.id as string
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [quickPromptValue, setQuickPromptValue] = useState<string | null>(null)

  // Fetch conversations for this case
  const { data: conversations, isLoading: loadingConversations } = useConversations(caseId)
  const createConversation = useCreateConversation()
  const sendMessage = useSendMessage()

  // Fetch messages for the active conversation
  const { data: dbMessages } = useMessages(activeConversationId || '')

  // Auto-select or create conversation on mount
  useEffect(() => {
    if (loadingConversations || activeConversationId) return
    if (!conversations) return

    // Find a recent active conversation (updated within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const recent = conversations.find(
      (c) => c.status === 'active' && c.updated_at > twoHoursAgo
    )

    if (recent) {
      setActiveConversationId(recent.id)
    } else {
      // Auto-create a new conversation
      createConversation.mutate(
        {
          case_id: caseId,
          conversation_type: 'case_analysis',
          context_type: 'case',
          context_id: caseId,
        },
        {
          onSuccess: (data) => {
            setActiveConversationId(data.id)
          },
        }
      )
    }
  }, [conversations, loadingConversations, activeConversationId, caseId, createConversation])

  // Convert DB messages to ChatInterface format
  const initialMessages = dbMessages?.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    timestamp: new Date(m.created_at).toLocaleTimeString(),
    model: m.model || undefined,
  }))

  // Persist messages after streaming completes
  const handleMessageComplete = useCallback(
    (userMsg: string, assistantMsg: string) => {
      if (!activeConversationId) return

      // Save user message
      sendMessage.mutate({
        conversation_id: activeConversationId,
        role: 'user',
        content: userMsg,
      })

      // Save assistant message
      sendMessage.mutate({
        conversation_id: activeConversationId,
        role: 'assistant',
        content: assistantMsg,
      })
    },
    [activeConversationId, sendMessage]
  )

  // Create a new conversation
  function handleNewChat() {
    createConversation.mutate(
      {
        case_id: caseId,
        conversation_type: 'case_analysis',
        context_type: 'case',
        context_id: caseId,
      },
      {
        onSuccess: (data) => {
          setActiveConversationId(data.id)
        },
      }
    )
  }

  const contextItems = [
    { label: 'Case Details', icon: Briefcase, included: true },
    { label: 'Medical Records', icon: FileText, included: true },
    { label: 'Timeline', icon: Clock, included: true },
    { label: 'Contacts', icon: Users, included: false },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      {/* Report Generator Card */}
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-50">
              <ScrollText className="h-5 w-5" style={{ color: '#C9A84C' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Generate Expert Report</h3>
              <p className="text-xs text-muted-foreground">
                Create a comprehensive report using AI summaries, notes, and your template
              </p>
            </div>
          </div>
          <Link href={`/cases/${caseId}/reports`}>
            <Button variant="outline">
              <ScrollText className="h-4 w-4 mr-2" />
              Open Report Generator
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Conversation Selector */}
          {conversations && conversations.length > 1 && (
            <Select
              value={activeConversationId || ''}
              onValueChange={(val) => setActiveConversationId(val)}
            >
              <SelectTrigger className="w-[200px] text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Select conversation" />
              </SelectTrigger>
              <SelectContent>
                {conversations.map((conv) => (
                  <SelectItem key={conv.id} value={conv.id} className="text-xs">
                    {conv.title || 'Untitled'} ({conv.message_count} msgs)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* New Chat Button */}
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>

          {/* Context Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowContext(!showContext)}
          >
            Context
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showContext ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Context Panel */}
      {showContext && (
        <Card className="mb-3">
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Included Context
            </p>
            <div className="flex flex-wrap gap-2">
              {contextItems.map((item) => (
                <Badge
                  key={item.label}
                  variant={item.included ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  <item.icon className="h-3 w-3 mr-1" />
                  {item.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 pb-3">
        {quickPrompts.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setQuickPromptValue(prompt)}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {prompt}
          </Button>
        ))}
      </div>

      {/* Chat Interface */}
      {activeConversationId ? (
        <ChatInterface
          key={activeConversationId}
          caseId={caseId}
          conversationType="case_analysis"
          initialMessages={initialMessages}
          onMessageComplete={handleMessageComplete}
          className="flex-1 min-h-0"
        />
      ) : (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Setting up conversation...</p>
          </div>
        </Card>
      )}
    </div>
  )
}
