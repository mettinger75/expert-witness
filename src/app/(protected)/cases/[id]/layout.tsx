'use client'

import { useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useCase, useUpdateCase } from '@/hooks/useCases'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CASE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  LayoutDashboard,
  FileText,
  Clock,
  Gavel,
  StickyNote,
  DollarSign,
  Brain,
  ArrowLeft,
  Mail,
  FolderOpen,
  ScrollText,
  Pencil,
  Check,
  X,
  AudioLines,
} from 'lucide-react'

const tabs = [
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Timeline', href: '/timeline', icon: Clock },
  { label: 'Medical Records', href: '/documents', icon: FileText },
  { label: 'Depositions', href: '/depositions', icon: Gavel },
  { label: 'Other Documents', href: '/other-documents', icon: FolderOpen },
  { label: 'Emails', href: '/emails', icon: Mail },
  { label: 'Notes', href: '/notes', icon: StickyNote },
  { label: 'Billing', href: '/billing', icon: DollarSign },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Contracts', href: '/contracts', icon: ScrollText },
  { label: 'Meetings', href: '/meetings', icon: AudioLines },
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
  const updateCase = useUpdateCase()
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')

  function startEditName() {
    setEditName(caseData?.case_name || '')
    setEditingName(true)
  }

  function handleSaveName() {
    if (editName.trim() && editName.trim() !== caseData?.case_name) {
      updateCase.mutate({ id: caseId, data: { case_name: editName.trim() } })
    }
    setEditingName(false)
  }

  function handleCancelName() {
    setEditingName(false)
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSaveName()
    if (e.key === 'Escape') handleCancelName()
  }

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
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  className="text-2xl font-semibold h-auto py-0.5 px-2"
                  style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
                  autoFocus
                />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={handleCancelName}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>{caseData.case_name}</h1>
                <button
                  onClick={startEditName}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
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
                    ? 'text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                )}
                style={isActive ? { borderBottomColor: '#C9A84C' } : undefined}
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
