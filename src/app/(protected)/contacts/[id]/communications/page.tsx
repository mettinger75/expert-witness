'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import {
  Mail, Phone, MessageSquare, Video,
  ArrowDownLeft, ArrowUpRight, AlertCircle,
} from 'lucide-react'

const communicationTypeIcons: Record<string, React.ElementType> = {
  email: Mail,
  phone: Phone,
  video: Video,
  in_person: MessageSquare,
  letter: Mail,
}

const communicationTypeLabels: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  video: 'Video Call',
  in_person: 'In Person',
  letter: 'Letter',
  fax: 'Fax',
  text: 'Text Message',
}

export default function ContactCommunicationsPage() {
  const params = useParams()
  const contactId = params.id as string

  const { data: logs, isLoading } = useQuery({
    queryKey: ['communication_logs', 'contact', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('contact_id', contactId)
        .order('communication_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!contactId,
  })

  if (isLoading) {
    return <LoadingSpinner className="py-12" />
  }

  if (!logs?.length) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No Communications"
        description="No communication logs found for this contact. Communications will be tracked here as they are logged."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication Log
          <Badge variant="secondary" className="ml-2">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const TypeIcon = communicationTypeIcons[log.communication_type] || MessageSquare
              const DirectionIcon = log.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight
              const directionColor = log.direction === 'inbound' ? 'text-blue-600' : 'text-emerald-600'

              return (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className="text-sm font-medium" style={{ color: '#091525' }}>
                      {formatDate(log.communication_date)}
                    </span>
                    {log.communication_date && (
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(log.communication_date).split(', ').pop()}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {communicationTypeLabels[log.communication_type] || log.communication_type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1 ${directionColor}`}>
                      <DirectionIcon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium capitalize">{log.direction || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium max-w-[200px] truncate block" style={{ color: '#091525' }}>
                      {log.subject || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground max-w-[250px] truncate block">
                      {log.summary || log.notes || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.follow_up_required ? (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600">Required</span>
                        {log.follow_up_date && (
                          <span className="text-xs text-muted-foreground ml-1">
                            by {formatDate(log.follow_up_date)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
