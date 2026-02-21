'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCases } from '@/hooks/useCases'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CASE_STATUSES, getLabelForValue, getColorForValue, OPTION_KEYS } from '@/lib/constants'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { formatDate, formatCurrency, formatDuration } from '@/lib/formatters'
import { Briefcase, Clock, DollarSign, AlertTriangle, ArrowRight, Activity } from 'lucide-react'

interface DashboardWidget {
  widget: string
  label: string
  is_visible: boolean
  sort_order: number
}

interface DashboardDeadline {
  id: string
  case_id: string
  milestone_name: string
  milestone_type: string
  target_date: string
  status: string
  days_until: number
  is_overdue: boolean
}

interface DashboardData {
  unbilledHours: number
  unbilledAmount: number
  outstandingBalance: number
  invoiceBalance: number
  chargesBalance: number
  upcomingDeadlines: DashboardDeadline[]
  caseActivity: Record<string, { description: string; timestamp: string }>
}

function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    },
  })
}

export default function DashboardPage() {
  const { getOptions } = useAppOptions()
  const { data: activeCases = [] } = useCases({ is_closed: false })
  const { data: dashData } = useDashboardData()

  // Get dashboard layout from settings
  const dashLayout = getOptions(OPTION_KEYS.DASHBOARD_LAYOUT) as unknown as DashboardWidget[]

  const allStats = [
    { key: 'stat_active_cases', title: 'Active Cases', value: String(activeCases.length), icon: Briefcase, href: '/cases' },
    { key: 'stat_pending_deadlines', title: 'Upcoming Deadlines', value: String(dashData?.upcomingDeadlines?.length ?? 0), icon: AlertTriangle, href: '/cases' },
    { key: 'stat_unbilled_hours', title: 'Unbilled Hours', value: dashData ? formatDuration(dashData.unbilledHours) : '—', icon: Clock, href: '/billing' },
    { key: 'stat_outstanding_invoices', title: 'Outstanding Balance', value: dashData ? formatCurrency(dashData.outstandingBalance) : '—', icon: DollarSign, href: '/billing' },
  ]

  // Filter and sort stats based on dashboard layout
  const stats = useMemo(() => {
    if (!dashLayout || dashLayout.length === 0) return allStats
    const statWidgets = dashLayout
      .filter((w) => w.widget.startsWith('stat_') && w.is_visible)
      .sort((a, b) => a.sort_order - b.sort_order)
    if (statWidgets.length === 0) return allStats
    return statWidgets
      .map((sw) => allStats.find((s) => s.key === sw.widget))
      .filter(Boolean) as typeof allStats
  }, [dashLayout, allStats])

  // Check widget visibility
  const isWidgetVisible = (widgetKey: string) => {
    if (!dashLayout || dashLayout.length === 0) return true
    const w = dashLayout.find((d) => d.widget === widgetKey)
    return w ? w.is_visible : true
  }

  const recentCases = activeCases.slice(0, 5)

  // Build a case ID → name map for deadline display
  const caseNameMap = useMemo(() => {
    const map: Record<string, { name: string; number: string }> = {}
    for (const c of activeCases) {
      map[c.id] = { name: c.case_name, number: c.case_number }
    }
    return map
  }, [activeCases])

  function getRelativeTime(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return formatDate(timestamp)
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Dashboard"
        description="Overview of your expert witness practice"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <div className="bg-white border border-[#D8DCE3] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#8892A2' }}>{stat.title}</p>
                  <p className="text-3xl font-bold tabular-nums mt-1" style={{ color: '#0E1F35' }}>{stat.value}</p>
                </div>
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(201, 168, 76, 0.10)' }}
                >
                  <stat.icon className="h-6 w-6" style={{ color: '#C9A84C' }} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases with Last Activity */}
        {isWidgetVisible('recent_cases') && (
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#091525' }}>
            <h2 className="text-sm font-semibold tracking-wide text-white">
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
              recentCases.map((c) => {
                const activity = dashData?.caseActivity?.[c.id]
                return (
                  <Link key={c.id} href={`/cases/${c.id}`} className="block px-6 py-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-800 truncate">{c.case_name}</p>
                          <StatusBadge
                            label={getLabelForValue(CASE_STATUSES, c.status)}
                            color={getColorForValue(CASE_STATUSES, c.status)}
                          />
                        </div>
                        <p className="text-xs text-neutral-500">{c.case_number}</p>
                        {activity && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Activity className="h-3 w-3 text-[#C9A84C]" />
                            <span className="text-xs text-neutral-500 truncate">
                              {activity.description}
                            </span>
                            <span className="text-xs text-neutral-400 shrink-0">
                              {getRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
        )}

        {/* Upcoming Deadlines - from case_milestones */}
        {isWidgetVisible('upcoming_deadlines') && (
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#091525' }}>
            <h2 className="text-sm font-semibold tracking-wide text-white">
              Upcoming Deadlines
            </h2>
            <Link href="/cases" className="text-xs flex items-center gap-1" style={{ color: '#C9A84C' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />
          <div className="divide-y" style={{ borderColor: '#F0F1F4' }}>
            {(!dashData?.upcomingDeadlines || dashData.upcomingDeadlines.length === 0) ? (
              <div className="p-6">
                <p className="text-sm text-neutral-500">No upcoming deadlines.</p>
              </div>
            ) : (
              dashData.upcomingDeadlines.slice(0, 8).map((d) => {
                const caseMeta = caseNameMap[d.case_id]
                return (
                  <Link key={d.id} href={`/cases/${d.case_id}`} className="block px-6 py-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">
                          {d.milestone_name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {caseMeta?.name || 'Case'} &middot; {formatDate(d.target_date)}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{
                          backgroundColor: d.is_overdue ? '#FEF2F2' : d.days_until <= 7 ? '#FEF2F2' : '#ECFDF5',
                          color: d.is_overdue ? '#DC2626' : d.days_until <= 7 ? '#DC2626' : '#059669',
                        }}
                      >
                        {d.is_overdue ? `${Math.abs(d.days_until)}d overdue` : `${d.days_until}d left`}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
