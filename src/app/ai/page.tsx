'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/formatters'
import { Plus, Brain, MessageSquare, Briefcase } from 'lucide-react'

// Placeholder conversation types
const CONVERSATION_TYPES = [
  { value: 'case_analysis', label: 'Case Analysis', color: 'blue' },
  { value: 'document_review', label: 'Document Review', color: 'green' },
  { value: 'report_drafting', label: 'Report Drafting', color: 'purple' },
  { value: 'research', label: 'Research', color: 'amber' },
  { value: 'general', label: 'General', color: 'gray' },
]

function getConversationTypeLabel(type: string): string {
  return CONVERSATION_TYPES.find((t) => t.value === type)?.label ?? type
}

// Placeholder conversations grouped by case
const placeholderConversations = [
  { id: '1', title: 'Standard of care analysis - monitoring protocols', conversation_type: 'case_analysis', case_name: 'Smith v. General Hospital', case_id: 'c1', message_count: 12, updated_at: '2025-10-15T14:30:00' },
  { id: '2', title: 'Anesthesia record discrepancies', conversation_type: 'document_review', case_name: 'Smith v. General Hospital', case_id: 'c1', message_count: 8, updated_at: '2025-10-14T09:15:00' },
  { id: '3', title: 'Draft expert report - opinion section', conversation_type: 'report_drafting', case_name: 'Smith v. General Hospital', case_id: 'c1', message_count: 15, updated_at: '2025-10-10T16:45:00' },
  { id: '4', title: 'Literature review - capnography monitoring', conversation_type: 'research', case_name: 'Johnson v. Metro Clinic', case_id: 'c2', message_count: 6, updated_at: '2025-10-12T11:00:00' },
  { id: '5', title: 'Preliminary opinion analysis', conversation_type: 'case_analysis', case_name: 'Johnson v. Metro Clinic', case_id: 'c2', message_count: 4, updated_at: '2025-10-08T10:30:00' },
]

// Group conversations by case
function groupByCase(conversations: typeof placeholderConversations) {
  const groups: Record<string, { caseName: string; caseId: string; conversations: typeof placeholderConversations }> = {}
  for (const conv of conversations) {
    if (!groups[conv.case_id]) {
      groups[conv.case_id] = { caseName: conv.case_name, caseId: conv.case_id, conversations: [] }
    }
    groups[conv.case_id].conversations.push(conv)
  }
  return Object.values(groups)
}

export default function AIPage() {
  const grouped = groupByCase(placeholderConversations)

  return (
    <div>
      <PageHeader
        title="AI Assistant"
        description="AI-powered conversations for case analysis and report drafting"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        }
      />

      {placeholderConversations.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No conversations yet"
          description="Start a new AI conversation to analyze cases, review documents, or draft reports."
          action={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.caseId}>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.caseName}
                </h2>
              </div>
              <div className="space-y-2">
                {group.conversations.map((conv) => (
                  <Link key={conv.id} href={`/cases/${conv.case_id}/ai`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="flex items-center gap-4 py-3">
                        <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">{conv.title}</h3>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {getConversationTypeLabel(conv.conversation_type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>{conv.message_count} messages</span>
                            <span>{formatDate(conv.updated_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
