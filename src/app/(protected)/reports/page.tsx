'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { REPORT_TYPES, getLabelForValue } from '@/lib/constants'
import { Plus, Search, FileCheck, Filter, FileText } from 'lucide-react'

// Placeholder templates
const placeholderTemplates = [
  { id: '1', name: 'Standard Expert Report', report_type: 'expert_report', description: 'Comprehensive expert report with opinion sections, standard of care analysis, and conclusions.', usage_count: 12 },
  { id: '2', name: 'Preliminary Opinion Letter', report_type: 'preliminary_opinion', description: 'Initial case review and preliminary opinion for the retaining attorney.', usage_count: 18 },
  { id: '3', name: 'Rebuttal Report', report_type: 'rebuttal_report', description: 'Response to opposing expert opinions with point-by-point analysis.', usage_count: 5 },
  { id: '4', name: 'Case Summary Report', report_type: 'case_summary', description: 'Brief summary of case facts, timeline, and key issues.', usage_count: 8 },
  { id: '5', name: 'Affidavit of Merit', report_type: 'affidavit', description: 'Sworn statement supporting the merit of the case, including qualifications and opinions.', usage_count: 15 },
  { id: '6', name: 'Supplemental Report', report_type: 'supplemental_report', description: 'Additional analysis based on newly received materials or deposition testimony.', usage_count: 3 },
]

export default function ReportsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredTemplates = placeholderTemplates.filter((t) => {
    if (typeFilter !== 'all' && t.report_type !== typeFilter) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Report Templates"
        description="Manage templates for expert witness reports"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Report Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REPORT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No templates found"
          description="Create a template to standardize your report generation."
          action={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Link key={template.id} href={`/reports/templates/${template.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="p-2 rounded-md bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="secondary">
                      {getLabelForValue(REPORT_TYPES, template.report_type)}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mt-3">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Used {template.usage_count} times
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
