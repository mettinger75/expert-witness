'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { DOCUMENT_CATEGORIES, DOCUMENT_SUB_TABS, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { useAllDocuments } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'
import type { DocumentRow } from '@/types/database.types'
import { Search, FileText, Filter, ExternalLink } from 'lucide-react'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [activeSubTab, setActiveSubTab] = useState('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<DocumentRow | null>(null)

  const activeTabConfig = DOCUMENT_SUB_TABS.find(t => t.key === activeSubTab) ?? DOCUMENT_SUB_TABS[0]

  const filters = {
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: search || undefined,
  }
  const { data: allDocuments = [], isLoading } = useAllDocuments(filters)

  // Filter by sub-tab
  const documents = (() => {
    let docs = allDocuments
    if (activeTabConfig.categories.length > 0 && categoryFilter === 'all') {
      docs = docs.filter(d => (activeTabConfig.categories as readonly string[]).includes(d.category))
    }
    return docs
  })()

  // Count documents per sub-tab
  const tabCounts = DOCUMENT_SUB_TABS.map(tab => ({
    key: tab.key,
    count: tab.categories.length === 0
      ? allDocuments.length
      : allDocuments.filter(d => (tab.categories as readonly string[]).includes(d.category)).length,
  }))

  // Relevant categories for current sub-tab filter dropdown
  const relevantCategories = activeTabConfig.categories.length > 0
    ? DOCUMENT_CATEGORIES.filter(c => (activeTabConfig.categories as readonly string[]).includes(c.value))
    : DOCUMENT_CATEGORIES

  function handleSubTabChange(key: string) {
    setActiveSubTab(key)
    setCategoryFilter('all')
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Browse all case documents across your practice"
      />

      {/* Sub-tabs */}
      <div className="border-b mb-4">
        <nav className="flex gap-1 overflow-x-auto">
          {DOCUMENT_SUB_TABS.map((tab) => {
            const isActive = activeSubTab === tab.key
            const count = tabCounts.find(c => c.key === tab.key)?.count ?? 0
            return (
              <button
                key={tab.key}
                onClick={() => handleSubTabChange(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-neutral-900 border-[#DFC06A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                )}
              >
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
        {relevantCategories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {relevantCategories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Documents Table */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`No ${activeTabConfig.label.toLowerCase()} found`}
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
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setViewingDoc(doc as DocumentRow)
                      setViewerOpen(true)
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">
                          {doc.original_file_name || doc.file_name}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-6 line-clamp-1">
                          {doc.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.cases?.case_name ? (
                        <Link
                          href={`/cases/${doc.case_id}`}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {doc.cases.case_name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getLabelForValue(DOCUMENT_CATEGORIES, doc.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.date_of_document
                        ? formatDate(doc.date_of_document)
                        : formatDate(doc.created_at)}
                    </TableCell>
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

      {/* Document Viewer */}
      <DocumentViewer
        document={viewingDoc}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  )
}
