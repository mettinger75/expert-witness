'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { useInboxEmails, useAssignEmailToCase, useDeleteEmail } from '@/hooks/useCommunicationLogs'
import { useCases } from '@/hooks/useCases'
import { Inbox, Mail, Clock, User, ArrowRight, Trash2, Eye } from 'lucide-react'
import type { CommunicationLogRow } from '@/types/database.types'

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function InboxPage() {
  const { data: emails = [], isLoading } = useInboxEmails()
  const { data: cases = [] } = useCases({ is_closed: false })
  const assignEmail = useAssignEmailToCase()
  const deleteEmail = useDeleteEmail()

  const [selectedEmail, setSelectedEmail] = useState<CommunicationLogRow | null>(null)
  const [assigningEmail, setAssigningEmail] = useState<CommunicationLogRow | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')

  function handleAssign() {
    if (!assigningEmail || !selectedCaseId) return
    assignEmail.mutate(
      { emailId: assigningEmail.id, caseId: selectedCaseId },
      {
        onSuccess: () => {
          setAssigningEmail(null)
          setSelectedCaseId('')
          if (selectedEmail?.id === assigningEmail.id) setSelectedEmail(null)
        },
      }
    )
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Incoming emails waiting to be assigned to a case"
      />

      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : emails.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Inbox}
              title="Inbox is empty"
              description="Forward emails to your Resend inbound address. They'll appear here and you can assign them to cases."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {emails.length} email{emails.length !== 1 ? 's' : ''} in inbox
              </h2>
            </div>
            {emails.map((email) => (
              <Card
                key={email.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedEmail?.id === email.id ? 'ring-2 ring-primary bg-accent/30' : ''
                }`}
                onClick={() => setSelectedEmail(email)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {email.from_name || email.from_email || 'Unknown sender'}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">{email.subject || '(no subject)'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {email.summary}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeDate(email.communication_date)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Email Detail + Actions */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-lg">{selectedEmail.subject || '(no subject)'}</CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {selectedEmail.from_name
                          ? `${selectedEmail.from_name} <${selectedEmail.from_email}>`
                          : selectedEmail.from_email || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(selectedEmail.communication_date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setAssigningEmail(selectedEmail)
                        setSelectedCaseId('')
                      }}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Assign to Case
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteEmail.mutate(selectedEmail.id, {
                        onSuccess: () => setSelectedEmail(null),
                      })}
                      disabled={deleteEmail.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground bg-transparent p-0 border-0">
                      {selectedEmail.details || selectedEmail.summary}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select an email to view its contents</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Assign to Case Dialog */}
      <Dialog open={!!assigningEmail} onOpenChange={(open) => !open && setAssigningEmail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Email to Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium">{assigningEmail?.subject || '(no subject)'}</p>
              <p className="text-xs text-muted-foreground">
                From: {assigningEmail?.from_name || assigningEmail?.from_email || 'Unknown'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select a case:</label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningEmail(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedCaseId || assignEmail.isPending}
            >
              {assignEmail.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
