'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CASE_STATUSES, getColorForValue, getLabelForValue } from '@/lib/constants'
import { formatDateShort } from '@/lib/formatters'
import { Briefcase } from 'lucide-react'

interface RecentCase {
  id: string
  case_number: string
  case_name: string
  status: string
  date_of_referral: string
}

// Placeholder data for the widget
const placeholderCases: RecentCase[] = [
  {
    id: '1',
    case_number: 'EW-2026-0042',
    case_name: 'Smith v. General Hospital',
    status: 'active',
    date_of_referral: '2026-01-28',
  },
  {
    id: '2',
    case_number: 'EW-2026-0041',
    case_name: 'Johnson v. Dr. Williams',
    status: 'accepted',
    date_of_referral: '2026-01-25',
  },
  {
    id: '3',
    case_number: 'EW-2026-0040',
    case_name: 'Davis Medical Center Case',
    status: 'inquiry',
    date_of_referral: '2026-01-22',
  },
  {
    id: '4',
    case_number: 'EW-2026-0039',
    case_name: 'Brown v. City Hospital',
    status: 'deposition_scheduled',
    date_of_referral: '2026-01-18',
  },
  {
    id: '5',
    case_number: 'EW-2026-0038',
    case_name: 'Wilson v. Anesthesia Associates',
    status: 'opinion_issued',
    date_of_referral: '2026-01-15',
  },
]

export function RecentCasesWidget() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Recent Cases</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {placeholderCases.map((caseItem) => (
            <Link
              key={caseItem.id}
              href={`/cases/${caseItem.id}`}
              className="flex items-center justify-between gap-3 hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {caseItem.case_number}
                  </span>
                  <StatusBadge
                    label={getLabelForValue(CASE_STATUSES, caseItem.status)}
                    color={getColorForValue(CASE_STATUSES, caseItem.status)}
                    className="text-[10px]"
                  />
                </div>
                <p className="text-sm font-medium truncate mt-0.5">{caseItem.case_name}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDateShort(caseItem.date_of_referral)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
