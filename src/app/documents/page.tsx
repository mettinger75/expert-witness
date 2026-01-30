'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { DOCUMENT_CATEGORIES, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { Search, FileText, Filter } from 'lucide-react'

// Placeholder data for the global documents browser
const placeholderDocs = [
  { id: '1', file_name: 'Anesthesia Record - 03/15/2025.pdf', case_name: 'Smith v. General Hospital', category: 'anesthesia_record', date_of_document: '2025-03-15', file_size: 2400000 },
  { id: '2', file_name: 'Operative Report.pdf', case_name: 'Smith v. General Hospital', category: 'operative_report', date_of_document: '2025-03-15', file_size: 890000 },
  { id: '3', file_name: 'Expert Report - Johnson Case.pdf', case_name: 'Johnson v. Metro Clinic', category: 'expert_report', date_of_document: '2025-06-20', file_size: 3200000 },
  { id: '4', file_name: 'Deposition Transcript - Dr. Lee.pdf', case_name: 'Williams v. St. Mary Hospital', category: 'deposition', date_of_document: '2025-07-10', file_size: 5600000 },
  { id: '5', file_name: 'Consent Form - Pre-Op.pdf', case_name: 'Smith v. General Hospital', category: 'consent_form', date_of_document: '2025-03-14', file_size: 340000 },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredDocs = placeholderDocs.filter((doc) => {
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false
    if (search) {
      const term = search.toLowerCase()
      return doc.file_name.toLowerCase().includes(term) || doc.case_name.toLowerCase().includes(term)
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Browse all case documents"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents across all cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Upload documents within a case to see them here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{doc.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.case_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getLabelForValue(DOCUMENT_CATEGORIES, doc.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(doc.date_of_document)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
