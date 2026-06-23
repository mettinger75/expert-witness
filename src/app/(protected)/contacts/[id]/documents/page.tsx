'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useContactCases } from '@/hooks/useCaseContacts'
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
import { DOCUMENT_CATEGORIES, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { FolderOpen, FileText, ExternalLink } from 'lucide-react'

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ContactDocumentsPage() {
  const params = useParams()
  const contactId = params.id as string
  const { data: linkedCases, isLoading: casesLoading } = useContactCases(contactId)

  const caseIds = linkedCases?.map((lc) => lc.case_id) ?? []
  const caseNameMap = new Map(
    linkedCases?.map((lc) => [lc.case_id, lc.cases?.case_name ?? 'Unknown Case']) ?? []
  )

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', 'contact', contactId, caseIds],
    queryFn: async () => {
      if (!caseIds.length) return []
      const { data, error } = await supabase
        .from('documents')
        .select('*, category:document_type, file_size:file_size_bytes, file_path:storage_path, date_of_document:document_date, is_exhibit:is_key_document')
        .in('case_id', caseIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
    enabled: caseIds.length > 0,
  })

  const isLoading = casesLoading || docsLoading

  if (isLoading) {
    return <LoadingSpinner className="py-12" />
  }

  if (!documents?.length) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No Documents"
        description="No documents found across this contact's linked cases. Documents will appear here once they are uploaded to a linked case."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Documents Across Linked Cases
          <Badge variant="secondary" className="ml-2">{documents.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Case</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm truncate max-w-[300px]" style={{ color: '#091525' }}>
                      {doc.file_name || doc.document_name || 'Untitled'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {doc.category ? (
                    <Badge variant="outline" className="text-xs">
                      {getLabelForValue(DOCUMENT_CATEGORIES, doc.category)}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/cases/${doc.case_id}`}
                    className="text-sm hover:underline text-muted-foreground"
                  >
                    {caseNameMap.get(doc.case_id) ?? 'Unknown'}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/cases/${doc.case_id}/documents`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
