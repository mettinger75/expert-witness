'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCases } from '@/hooks/useCases'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CASE_STATUSES, CASE_TYPES, CASE_PRIORITIES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { Plus, Search, Briefcase, Filter } from 'lucide-react'

export default function CasesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: cases, isLoading } = useCases({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    case_type: typeFilter !== 'all' ? typeFilter : undefined,
    is_closed: false,
  })

  return (
    <div>
      <PageHeader
        title="Cases"
        description="Manage your expert witness engagements"
        action={
          <Link href="/cases/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CASE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Case Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CASE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cases List */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : !cases?.length ? (
        <EmptyState
          icon={Briefcase}
          title="No cases found"
          description="Create your first case to get started tracking your expert witness engagements."
          action={
            <Link href="/cases/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {c.case_number}
                      </span>
                      <StatusBadge
                        label={getLabelForValue(CASE_STATUSES, c.status)}
                        color={getColorForValue(CASE_STATUSES, c.status)}
                      />
                      <StatusBadge
                        label={getLabelForValue(CASE_PRIORITIES, c.priority)}
                        color={getColorForValue(CASE_PRIORITIES, c.priority)}
                      />
                    </div>
                    <h3 className="font-semibold truncate">{c.case_name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{getLabelForValue(CASE_TYPES, c.case_type)}</span>
                      <span className="capitalize">{c.side}</span>
                      {c.patient_name && <span>Patient: {c.patient_name}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-muted-foreground">Referred</div>
                    <div className="text-sm font-medium">{formatDate(c.date_of_referral)}</div>
                    {c.outstanding_balance > 0 && (
                      <Badge variant="outline" className="mt-1 text-amber-700 border-amber-200 bg-amber-50">
                        {formatCurrency(c.outstanding_balance)} due
                      </Badge>
                    )}
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
