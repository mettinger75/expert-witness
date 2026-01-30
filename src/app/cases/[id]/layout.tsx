'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useCase } from '@/hooks/useCases'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CASE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Gavel,
  StickyNote,
  DollarSign,
  FileCheck,
  Brain,
  ArrowLeft,
} from 'lucide-react'

const tabs = [
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Timeline', href: '/timeline', icon: Clock },
  { label: 'Depositions', href: '/depositions', icon: Gavel },
  { label: 'Notes', href: '/notes', icon: StickyNote },
  { label: 'Billing', href: '/billing', icon: DollarSign },
  { label: 'Reports', href: '/reports', icon: FileCheck },
  { label: 'AI', href: '/ai', icon: Brain },
]

export default function CaseDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const caseId = params.id as string
  const { data: caseData, isLoading } = useCase(caseId)

  if (isLoading) {
    return <LoadingSpinner className="py-12" />
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Case not found</p>
        <Link href="/cases">
          <Button variant="link">Back to Cases</Button>
        </Link>
      </div>
    )
  }

  const basePath = `/cases/${caseId}`

  return (
    <div>
      {/* Case Header */}
      <div className="mb-6">
        <Link href="/cases" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Cases
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-muted-foreground">
                {caseData.case_number}
              </span>
              <StatusBadge
                label={getLabelForValue(CASE_STATUSES, caseData.status)}
                color={getColorForValue(CASE_STATUSES, caseData.status)}
              />
            </div>
            <h1 className="text-2xl font-bold">{caseData.case_name}</h1>
            {caseData.patient_name && (
              <p className="text-sm text-muted-foreground mt-1">
                Patient: {caseData.patient_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6 -mx-8 px-8">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const href = `${basePath}${tab.href}`
            const isActive = tab.href === ''
              ? pathname === basePath
              : pathname.startsWith(href)

            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {children}
    </div>
  )
}
