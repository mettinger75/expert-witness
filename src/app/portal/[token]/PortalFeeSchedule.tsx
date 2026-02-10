'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign } from 'lucide-react'
import { ACTIVITY_TYPES } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'

interface FeeScheduleItem {
  activity_type: string
  description: string
  rate_per_hour: number
}

interface PortalFeeScheduleProps {
  feeSchedule: FeeScheduleItem[]
}

export function PortalFeeSchedule({ feeSchedule }: PortalFeeScheduleProps) {
  if (feeSchedule.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No fee schedule available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#0E1F35] flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#C9A84C]" />
          Fee Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0E1F35]/5">
                <TableHead className="text-[#0E1F35] font-semibold">
                  Activity Type
                </TableHead>
                <TableHead className="text-[#0E1F35] font-semibold text-right">
                  Rate / Hr
                </TableHead>
                <TableHead className="text-[#0E1F35] font-semibold">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeSchedule.map((item) => {
                const label =
                  ACTIVITY_TYPES.find((a) => a.value === item.activity_type)
                    ?.label ?? item.activity_type
                return (
                  <TableRow key={item.activity_type}>
                    <TableCell className="font-medium text-[#0E1F35]">
                      {label}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#C9A84C]">
                      {formatCurrency(item.rate_per_hour)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {item.description || '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Rates effective as of January 2025. Subject to change.
        </p>
      </CardContent>
    </Card>
  )
}
