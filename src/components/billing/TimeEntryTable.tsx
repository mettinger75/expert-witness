'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ACTIVITY_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDate, formatDuration, formatCurrency } from '@/lib/formatters'
import type { TimeEntryRow } from '@/types/database.types'
import { Edit, Trash2, CheckCircle, Circle, Clock } from 'lucide-react'

interface TimeEntryTableProps {
  entries: TimeEntryRow[]
  showCase?: boolean
  onEdit?: (entry: TimeEntryRow) => void
  onDelete?: (id: string) => void
}

export function TimeEntryTable({ entries, showCase = false, onEdit, onDelete }: TimeEntryTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No time entries"
        description="Track your time by adding time entries for work on this case."
      />
    )
  }

  const totalHours = entries.reduce((sum, e) => sum + e.duration_hours, 0)
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {showCase && <TableHead>Case</TableHead>}
          <TableHead>Activity Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-center">Billable</TableHead>
          <TableHead>Status</TableHead>
          {(onEdit || onDelete) && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
            {showCase && <TableCell className="text-sm">{entry.case_id}</TableCell>}
            <TableCell>
              <span className="text-sm">
                {getLabelForValue(ACTIVITY_TYPES, entry.activity_type)}
              </span>
            </TableCell>
            <TableCell className="text-sm max-w-xs truncate">{entry.description}</TableCell>
            <TableCell className="text-right text-sm">
              {formatDuration(entry.duration_hours)}
            </TableCell>
            <TableCell className="text-right text-sm">
              {formatCurrency(entry.rate)}/hr
            </TableCell>
            <TableCell className="text-right text-sm font-medium">
              {formatCurrency(entry.amount)}
            </TableCell>
            <TableCell className="text-center">
              {entry.is_billable ? (
                <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground mx-auto" />
              )}
            </TableCell>
            <TableCell>
              {entry.is_billed ? (
                <StatusBadge label="Billed" color="green" />
              ) : (
                <StatusBadge label="Unbilled" color="yellow" />
              )}
            </TableCell>
            {(onEdit || onDelete) && (
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(entry)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={showCase ? 4 : 3} className="font-semibold">
            Totals
          </TableCell>
          <TableCell className="text-right font-semibold">
            {formatDuration(totalHours)}
          </TableCell>
          <TableCell />
          <TableCell className="text-right font-semibold">
            {formatCurrency(totalAmount)}
          </TableCell>
          <TableCell />
          <TableCell />
          {(onEdit || onDelete) && <TableCell />}
        </TableRow>
      </TableFooter>
    </Table>
  )
}
