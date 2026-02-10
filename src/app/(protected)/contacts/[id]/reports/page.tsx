'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
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
import { formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { FileText, ExternalLink, Eye } from 'lucide-react'

export default function ContactReportsPage() {
  const params = useParams()
  const contactId = params.id as string

  const { data: sharedLinks, isLoading } = useQuery({
    queryKey: ['shared-links', 'contact', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!contactId,
  })

  if (isLoading) {
    return <LoadingSpinner className="py-12" />
  }

  if (!sharedLinks?.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No Shared Reports"
        description="No reports have been shared with this contact yet. Share reports from the case reports page."
      />
    )
  }

  function getStatusInfo(link: { expires_at: string | null; is_revoked?: boolean }) {
    if (link.is_revoked) return { label: 'Revoked', color: 'red' }
    if (link.expires_at && new Date(link.expires_at) < new Date()) return { label: 'Expired', color: 'orange' }
    return { label: 'Active', color: 'green' }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Shared Reports
          <Badge variant="secondary" className="ml-2">{sharedLinks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report / Entity</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Shared On</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sharedLinks.map((link) => {
              const status = getStatusInfo(link)
              return (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm" style={{ color: '#091525' }}>
                        {link.entity_type === 'report' ? 'Report' : link.entity_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {link.entity_id?.slice(0, 8)}...
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {link.permission_level || 'view'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(link.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {link.expires_at ? formatDate(link.expires_at) : 'Never'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{link.view_count ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={status.label} color={status.color} />
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
