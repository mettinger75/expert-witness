'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCases } from '@/hooks/useCases'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { OPTION_KEYS } from '@/lib/constants'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { Plus, Search, Briefcase, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import type { CaseRow } from '@/types/database.types'

const STATUS_GROUP_ORDER = [
  { key: 'active', label: 'Active Cases', statuses: ['active'] },
  { key: 'accepted', label: 'Accepted Cases', statuses: ['accepted'] },
  { key: 'inquiry', label: 'Inquiries', statuses: ['inquiry'] },
  { key: 'closed', label: 'Closed Cases', statuses: ['closed', 'declined', 'withdrawn'] },
]

function CaseTableSection({
  label,
  cases,
  defaultOpen = true,
  getLabel,
  getColor,
}: {
  label: string
  cases: CaseRow[]
  defaultOpen?: boolean
  getLabel: (key: string, value: string) => string
  getColor: (key: string, value: string) => string
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (!cases.length) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-3 group cursor-pointer"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#0E1F35]">
          {label}
        </h2>
        <span className="text-xs font-medium text-muted-foreground bg-[#F1F2F4] px-2 py-0.5 rounded-full">
          {cases.length}
        </span>
      </button>

      {open && (
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#091525] hover:bg-[#091525]">
                <TableHead className="text-white/80 font-semibold">Case</TableHead>
                <TableHead className="text-white/80 font-semibold">Type</TableHead>
                <TableHead className="text-white/80 font-semibold">Side</TableHead>
                <TableHead className="text-white/80 font-semibold">Status</TableHead>
                <TableHead className="text-white/80 font-semibold">Priority</TableHead>
                <TableHead className="text-white/80 font-semibold">Patient</TableHead>
                <TableHead className="text-white/80 font-semibold">Next Deadline</TableHead>
                <TableHead className="text-white/80 font-semibold text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-[#C9A84C]/5 transition-colors"
                  onClick={() => window.location.href = `/cases/${c.id}`}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#0E1F35]">{c.case_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{c.case_number}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getLabel(OPTION_KEYS.CASE_TYPES, c.case_type)}
                  </TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">
                    {c.side}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={getLabel(OPTION_KEYS.CASE_STATUSES, c.status)}
                      color={getColor(OPTION_KEYS.CASE_STATUSES, c.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={getLabel(OPTION_KEYS.CASE_PRIORITIES, c.priority)}
                      color={getColor(OPTION_KEYS.CASE_PRIORITIES, c.priority)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.patient_name || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.deadline_next ? (
                      <div>
                        <p className={new Date(c.deadline_next) < new Date() ? 'text-red-600 font-medium' : ''}>
                          {formatDate(c.deadline_next)}
                        </p>
                        {c.deadline_description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{c.deadline_description}</p>
                        )}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.outstanding_balance > 0 ? (
                      <span className="text-sm font-medium text-amber-700">
                        {formatCurrency(c.outstanding_balance)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default function CasesPage() {
  const { getActiveOptions, getLabel, getColor } = useAppOptions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: cases, isLoading } = useCases({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    case_type: typeFilter !== 'all' ? typeFilter : undefined,
  })

  const groupedCases = useMemo(() => {
    if (!cases) return []
    return STATUS_GROUP_ORDER.map((group) => ({
      ...group,
      cases: cases
        .filter((c) => group.statuses.includes(c.status))
        .sort((a, b) => {
          // Cases with a deadline come first, sorted by soonest
          const aDate = a.deadline_next ? new Date(a.deadline_next).getTime() : Infinity
          const bDate = b.deadline_next ? new Date(b.deadline_next).getTime() : Infinity
          return aDate - bDate
        }),
    })).filter((g) => g.cases.length > 0)
  }, [cases])

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
            {getActiveOptions(OPTION_KEYS.CASE_STATUSES).map((s) => (
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
            {getActiveOptions(OPTION_KEYS.CASE_TYPES).map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cases grouped by status */}
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
        <div>
          {groupedCases.map((group) => (
            <CaseTableSection
              key={group.key}
              label={group.label}
              cases={group.cases}
              defaultOpen={group.key !== 'closed'}
              getLabel={getLabel}
              getColor={getColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}
