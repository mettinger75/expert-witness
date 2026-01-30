'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { DOCUMENT_CATEGORIES, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import {
  Upload, FileText, Search, Star, Filter,
  Folder, FolderOpen, ChevronRight,
} from 'lucide-react'

// Placeholder document data for display
const placeholderDocs = [
  { id: '1', file_name: 'Anesthesia Record - 03/15/2025.pdf', category: 'anesthesia_record', date_of_document: '2025-03-15', page_count: 12, is_exhibit: true },
  { id: '2', file_name: 'Operative Report.pdf', category: 'operative_report', date_of_document: '2025-03-15', page_count: 4, is_exhibit: false },
  { id: '3', file_name: 'Nursing Notes - ICU.pdf', category: 'nursing_notes', date_of_document: '2025-03-16', page_count: 28, is_exhibit: false },
  { id: '4', file_name: 'Plaintiff Expert Report - Dr. Smith.pdf', category: 'expert_report', date_of_document: '2025-08-01', page_count: 15, is_exhibit: true },
  { id: '5', file_name: 'Lab Results - CBC and CMP.pdf', category: 'lab_results', date_of_document: '2025-03-15', page_count: 3, is_exhibit: false },
]

const placeholderFolders = [
  { id: 'f1', name: 'Medical Records', count: 15 },
  { id: 'f2', name: 'Correspondence', count: 8 },
  { id: 'f3', name: 'Expert Reports', count: 3 },
  { id: 'f4', name: 'Pleadings', count: 6 },
  { id: 'f5', name: 'Deposition Transcripts', count: 2 },
]

export default function CaseDocumentsPage() {
  const params = useParams()
  const caseId = params.id as string
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const filteredDocs = placeholderDocs.filter((doc) => {
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false
    if (search && !doc.file_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">Manage case documents and files</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="py-8">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Drag and drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <Button variant="outline" className="mt-4">
                  Choose Files
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6">
        {/* Folder Tree Sidebar */}
        <div className="w-64 shrink-0">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Folders</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                  !selectedFolder ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedFolder(null)}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                All Documents
              </div>
              {placeholderFolders.map((folder) => (
                <div
                  key={folder.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                    selectedFolder === folder.id ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    {folder.name}
                  </div>
                  <span className="text-xs text-muted-foreground">{folder.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Document Grid */}
        <div className="flex-1">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
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

          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="Upload documents to start building your case file."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-start gap-3 py-4">
                    <div className="p-2 rounded-md bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium truncate">{doc.file_name}</h4>
                        {doc.is_exhibit && (
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getLabelForValue(DOCUMENT_CATEGORIES, doc.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(doc.date_of_document)}
                        </span>
                        {doc.page_count && (
                          <span className="text-xs text-muted-foreground">
                            {doc.page_count} pages
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
