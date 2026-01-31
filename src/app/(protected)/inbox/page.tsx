'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Inbox, Mail } from 'lucide-react'

export default function InboxPage() {
  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Incoming emails and communications"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Inbox}
            title="Inbox is empty"
            description="Forward emails to your Resend inbound address to see them here. Once connected, incoming emails will appear and can be assigned to cases."
          />
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-medium mb-2">Setup Instructions</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Add your <code className="text-xs bg-background px-1 py-0.5 rounded">RESEND_API_KEY</code> to your environment variables</li>
              <li>Configure a Resend inbound domain to forward to <code className="text-xs bg-background px-1 py-0.5 rounded">/api/email/inbound</code></li>
              <li>Forward case-related emails to your configured inbound address</li>
              <li>Emails will appear here and can be assigned to specific cases</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
