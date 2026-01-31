'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain, Send, User, Bot, ChevronDown, Sparkles,
  FileText, Clock, Users, Briefcase,
} from 'lucide-react'

// Placeholder messages
const placeholderMessages = [
  {
    id: '1',
    role: 'user' as const,
    content: 'Analyze the standard of care applicable to the anesthesia management in this case. Focus on monitoring requirements and response to hypotension.',
    created_at: '2025-10-15T14:00:00',
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: `Based on my review of the case materials, here is my analysis of the applicable standard of care:

**Monitoring Standards:**
The ASA Standards for Basic Anesthetic Monitoring (2020) require continuous monitoring of oxygenation, ventilation, circulation, and temperature during all anesthesia procedures. Specifically:

1. **Pulse oximetry** must be continuously employed
2. **Blood pressure and heart rate** must be evaluated at least every five minutes
3. **Capnography** is required when an endotracheal tube is in place

**Response to Hypotension:**
The standard of care requires prompt recognition and treatment of intraoperative hypotension. According to current guidelines:

- A mean arterial pressure (MAP) below 65 mmHg requires immediate intervention
- First-line treatment includes vasopressors (ephedrine or phenylephrine)
- The cause of hypotension should be systematically evaluated

**Application to This Case:**
The records suggest a delay of approximately 8 minutes between the onset of hypotension and the administration of vasopressors, which falls outside the accepted standard of care for a prompt response to hemodynamic instability.

Would you like me to elaborate on any specific aspect of this analysis?`,
    created_at: '2025-10-15T14:01:00',
  },
  {
    id: '3',
    role: 'user' as const,
    content: 'Yes, please elaborate on the 8-minute delay. What would the expected response time be?',
    created_at: '2025-10-15T14:05:00',
  },
  {
    id: '4',
    role: 'assistant' as const,
    content: `The expected response time for intraoperative hypotension is a critical aspect of this case:

**Expected Response Time:**
Based on standard anesthesia practice and published guidelines, the expected response to a significant drop in blood pressure would be:

1. **Recognition:** Within 1-2 minutes of onset, given continuous monitoring
2. **Initial intervention:** Within 2-3 minutes, including fluid bolus and vasopressor administration
3. **Total response time:** Generally within 3-5 minutes from onset to initial treatment

**The 8-Minute Delay:**
In this case, the anesthesia record shows:
- Blood pressure reading of 80/50 noted at 08:45
- No intervention documented until ephedrine administration at 08:53

This 8-minute gap between recognition of hypotension and treatment represents a departure from the standard of care. During this period, the patient was at risk for:
- End-organ hypoperfusion
- Myocardial ischemia
- Cerebral hypoperfusion

This delay is particularly concerning given that the patient subsequently developed bradycardia at 09:00, which may have been a consequence of the prolonged hypotensive episode.`,
    created_at: '2025-10-15T14:06:00',
  },
]

// Prompt quick-select options
const quickPrompts = [
  'Analyze standard of care',
  'Summarize medical records',
  'Draft opinion section',
  'Generate timeline',
  'Review causation',
]

export default function CaseAIPage() {
  const params = useParams()
  const caseId = params.id as string
  const [inputValue, setInputValue] = useState('')
  const [selectedModel, setSelectedModel] = useState('standard')
  const [showContext, setShowContext] = useState(false)

  const contextItems = [
    { label: 'Case Details', icon: Briefcase, included: true },
    { label: 'Medical Records', icon: FileText, included: true },
    { label: 'Timeline', icon: Clock, included: true },
    { label: 'Contacts', icon: Users, included: false },
  ]

  function handleSend() {
    if (!inputValue.trim()) return
    // Placeholder - would send message to AI API
    setInputValue('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Model Selector */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[160px]">
              <Sparkles className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">Fast (GPT-4o mini)</SelectItem>
              <SelectItem value="standard">Standard (GPT-4o)</SelectItem>
              <SelectItem value="advanced">Advanced (Claude)</SelectItem>
            </SelectContent>
          </Select>

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
        <Card className="mb-4">
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

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {placeholderMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
              {message.role === 'user' && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 py-3 border-t">
        {quickPrompts.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInputValue(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex items-end gap-2 pt-2">
        <Textarea
          placeholder="Ask about this case..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={2}
          className="resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
