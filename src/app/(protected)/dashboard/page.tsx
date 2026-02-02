'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCases } from '@/hooks/useCases'
import { useInvoices } from '@/hooks/useInvoices'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CASE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { Briefcase, Clock, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const { data: activeCases = [] } = useCases({ is_closed: false })
  const { data: allInvoices = [] } = useInvoices()

  const outstandingBalance = allInvoices
    .filter((i) => ['sent', 'overdue', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + (i.balance_due || 0), 0)

  const casesWithDeadlines = activeCases.filter((c) => c.deadline_next)
  const upcomingDeadlines = casesWithDeadlines.filter((c) => {
    const deadline = new Date(c.deadline_next!)
    const now = new Date()
    const diffDays = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 30 && diffDays >= -7
  })

  const stats = [
    { title: 'Active Cases', value: String(activeCases.length), icon: Briefcase, color: '#091525', href: '/cases' },
    { title: 'Unbilled Hours', value: '—', icon: Clock, color: '#F59E0B', href: '/billing' },
    { title: 'Outstanding Balance', value: formatCurrency(outstandingBalance), icon: DollarSign, color: '#10B981', href: '/billing' },
    { title: 'Upcoming Deadlines', value: String(upcomingDeadlines.length), icon: AlertTriangle, color: '#EF4444', href: '/cases' },
  ]

  const recentCases = activeCases.slice(0, 5)

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <PageHeader
        title="Dashboard"
        description="Overview of your expert witness practice"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-neutral-500">{stat.title}</p>
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <p className="text-3xl font-semibold text-neutral-900 tabular-nums">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#091525' }}>
            <h2
              className="text-sm font-semibold tracking-wide text-white"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Recent Cases
            </h2>
            <Link href="/cases" className="text-xs flex items-center gap-1" style={{ color: '#C9A84C' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />
          <div className="divide-y" style={{ borderColor: '#F0F1F4' }}>
            {recentCases.length === 0 ? (
              <div className="p-6">
                <p className="text-sm text-neutral-500">No cases yet. Create your first case to get started.</p>
              </div>
            ) : (
              recentCases.map((c) => (
                <Link key={c.id} href={`/cases/${c.id}`} className="block px-6 py-3 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{c.case_name}</p>
                      <p className="text-xs text-neutral-500">{c.case_number}</p>
                    </div>
                    <StatusBadge
                      label={getLabelForValue(CASE_STATUSES, c.status)}
                      color={getColorForValue(CASE_STATUSES, c.status)}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#091525' }}>
            <h2
              className="text-sm font-semibold tracking-wide text-white"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Upcoming Deadlines
            </h2>
            <Link href="/cases" className="text-xs flex items-center gap-1" style={{ color: '#C9A84C' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />
          <div className="divide-y" style={{ borderColor: '#F0F1F4' }}>
            {upcomingDeadlines.length === 0 ? (
              <div className="p-6">
                <p className="text-sm text-neutral-500">No upcoming deadlines.</p>
              </div>
            ) : (
              upcomingDeadlines.map((c) => {
                const deadline = new Date(c.deadline_next!)
                const now = new Date()
                const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysUntil < 0
                return (
                  <Link key={c.id} href={`/cases/${c.id}`} className="block px-6 py-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{c.case_name}</p>
                        <p className="text-xs text-neutral-500">
                          {c.deadline_description || 'Deadline'}: {formatDate(c.deadline_next!)}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{
                          backgroundColor: isOverdue ? '#FEF2F2' : daysUntil <= 7 ? '#FEF2F2' : '#ECFDF5',
                          color: isOverdue ? '#DC2626' : daysUntil <= 7 ? '#DC2626' : '#059669',
                        }}
                      >
                        {isOverdue ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d left`}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
