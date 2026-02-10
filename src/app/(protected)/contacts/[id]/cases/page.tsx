'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useContactCases } from '@/hooks/useCaseContacts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
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
import {
  CASE_STATUSES,
  CASE_CONTACT_ROLES,
  getLabelForValue,
  getColorForValue,
} from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { Briefcase, ExternalLink } from 'lucide-react'

export default function ContactCasesPage() {
  const params = useParams()
  const contactId = params.id as string
  const { data: linkedCases, isLoading } = useContactCases(contactId)

  if (isLoading) {
    return <LoadingSpinner className="py-12" />
  }

  if (!linkedCases?.length) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No Linked Cases"
        description="This contact has not been linked to any cases yet. Link them to a case from the case detail page."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Linked Cases
          <Badge variant="secondary" className="ml-2">{linkedCases.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Date of Referral</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linkedCases.map((link) => {
              const caseData = link.cases
              return (
                <TableRow key={link.id}>
                  <TableCell>
                    <Link
                      href={`/cases/${link.case_id}`}
                      className="font-medium text-sm hover:underline"
                      style={{ color: '#091525' }}
                    >
                      {caseData?.case_name ?? 'Unknown Case'}
                    </Link>
                    {caseData?.case_number && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {caseData.case_number}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getLabelForValue(CASE_CONTACT_ROLES, link.role)}
                    </Badge>
                    {link.is_primary && (
                      <Badge variant="default" className="text-xs ml-1">Primary</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {caseData?.status && (
                      <StatusBadge
                        label={getLabelForValue(CASE_STATUSES, caseData.status)}
                        color={getColorForValue(CASE_STATUSES, caseData.status)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{caseData?.side ?? '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(caseData?.date_of_referral)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/cases/${link.case_id}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
