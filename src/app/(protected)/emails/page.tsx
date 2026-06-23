'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAllCommunicationLogs } from '@/hooks/useCommunicationLogs'
import { ComposeEmailDialog } from '@/components/emails/ComposeEmailDialog'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/formatters'
import { Search, Mail, Send, Inbox, ArrowUpRight, ArrowDownLeft, ExternalLink, PenSquare } from 'lucide-react'

const EMAIL_SUB_TABS = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
] as const

function commTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    email_sent: 'Email Sent',
    email_received: 'Email Received',
    phone_call: 'Phone Call',
    video_conference: 'Video Conference',
    meeting: 'Meeting',
    in_person: 'In Person',
    letter_sent: 'Letter Sent',
    letter_received: 'Letter Received',
    text_message: 'Text Message',
    voicemail: 'Voicemail',
    portal_message: 'Portal Message',
  }
  return labels[type] || type.replace(/_/g, ' ')
}

function commTypeBadgeColor(type: string): string {
  if (type.includes('email')) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (type.includes('phone') || type.includes('video')) return 'bg-green-50 text-green-700 border-green-200'
  if (type.includes('portal')) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-50 text-gray-700 border-gray-200'
}

export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)

  const directionFilter = activeTab === 'sent' ? 'outbound' : activeTab === 'received' ? 'inbound' : undefined
  const { data: allLogs = [], isLoading } = useAllCommunicationLogs({
    direction: directionFilter,
    search: search || undefined,
  })

  // Count per tab
  const { data: allForCounts = [] } = useAllCommunicationLogs()
  const tabCounts = {
    all: allForCounts.length,
    sent: allForCounts.filter(l => l.direction === 'outbound').length,
    received: allForCounts.filter(l => l.direction === 'inbound').length,
  }

  return (
    <div>
      <PageHeader
        title="Emails & Communications"
        description="All communications across your practice"
        action={
          <Button onClick={() => setComposeOpen(true)}>
            <PenSquare className="h-4 w-4 mr-2" />
            Compose
          </Button>
        }
      />

      {/* Sub-tabs */}
      <div className="border-b mb-4">
        <nav className="flex gap-1 overflow-x-auto">
          {EMAIL_SUB_TABS.map((tab) => {
            const isActive = activeTab === tab.key
            const count = tabCounts[tab.key as keyof typeof tabCounts] ?? 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-neutral-900 border-[#DFC06A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                )}
              >
                {tab.key === 'sent' && <Send className="h-3.5 w-3.5" />}
                {tab.key === 'received' && <Inbox className="h-3.5 w-3.5" />}
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                    isActive ? 'bg-[#DFC06A]/15 text-[#8B7333]' : 'bg-neutral-100 text-neutral-500'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails and communications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : allLogs.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No communications found"
          description="Send an email or log a communication to see it here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell>
                      {log.direction === 'outbound' ? (
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {log.subject || '(No subject)'}
                        </p>
                        {log.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {log.summary}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.from_name || log.from_email || '—'}
                    </TableCell>
                    <TableCell>
                      {log.cases?.case_name ? (
                        <Link
                          href={`/cases/${log.case_id}`}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                        >
                          {log.cases.case_name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', commTypeBadgeColor(log.communication_type))}>
                        {commTypeLabel(log.communication_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.communication_date || log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Compose Dialog */}
      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
      />
    </div>
  )
}
