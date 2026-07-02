'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCases } from '@/hooks/useCases'
import { useToggleMilestone } from '@/hooks/useMilestones'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CASE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatDate, formatCurrency, formatDuration } from '@/lib/formatters'
import {
  Briefcase, Clock, DollarSign, AlertTriangle, ArrowRight, Activity,
  Calendar, CheckSquare, Link2, Users, TrendingUp, Eye, Send, ExternalLink,
} from 'lucide-react'
import { PortalActivityDrawer } from '@/components/portal/PortalActivityDrawer'
import { authHeaders } from '@/lib/api-client'

interface DashboardDeadline {
  id: string
  case_id: string
  milestone_name: string
  milestone_type: string
  target_date: string
  status: string
  days_until: number
  is_overdue: boolean
  case_name?: string
}

interface ScheduleItem {
  id: string
  title: string
  date: string
  type: 'milestone' | 'calendar'
  caseId?: string
  caseName?: string
  isCompleted?: boolean
}

interface PortalInvite {
  id: string
  caseId: string
  contactId?: string
  token?: string
  contactName: string
  contactEmail?: string
  organization?: string
  caseName?: string
  caseNumber?: string
  viewCount: number
  lastAccessed: string | null
  createdAt: string
  onboardingProgress: string | null
  status: 'sent' | 'in_progress' | 'completed'
}

interface OutstandingInvoice {
  id: string
  invoiceNumber: string
  balanceDue: number
  totalAmount: number
  status: string
  dueDate: string
  billToName: string
  caseName?: string
}

interface DashboardData {
  unbilledHours: number
  unbilledAmount: number
  outstandingBalance: number
  invoiceBalance: number
  chargesBalance: number
  collectedYTD: number
  pendingInvites: number
  upcomingDeadlines: DashboardDeadline[]
  upcomingSchedule: ScheduleItem[]
  outstandingInvoices: OutstandingInvoice[]
  portalInvites: PortalInvite[]
  caseActivity: Record<string, { description: string; timestamp: string }>
}

function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', {
        headers: { ...(await authHeaders()) },
      })
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    },
  })
}

function WidgetHeader({ title, href, linkText = 'View all' }: { title: string; href: string; linkText?: string }) {
  return (
    <>
      <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: '#091525' }}>
        <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
        <Link href={href} className="text-xs flex items-center gap-1" style={{ color: '#DFC06A' }}>
          {linkText} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div style={{ height: 2, background: 'linear-gradient(90deg, #DFC06A, #DFC06A, #DFC06A)' }} />
    </>
  )
}

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

function inviteStatusBadge(status: string) {
  switch (status) {
    case 'sent': return <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Sent</Badge>
    case 'in_progress': return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
    case 'completed': return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Complete</Badge>
    default: return null
  }
}

export default function DashboardPage() {
  const { data: activeCases = [] } = useCases({ is_closed: false })
  const { data: dashData } = useDashboardData()
  const toggleMilestone = useToggleMilestone()
  const [activeInvite, setActiveInvite] = useState<PortalInvite | null>(null)

  const nonInquiryCases = activeCases.filter(c => c.status !== 'inquiry')

  const stats = [
    { title: 'Active Cases', value: String(nonInquiryCases.length), icon: Briefcase, href: '/cases', color: '#DFC06A' },
    { title: 'Pending Invites', value: String(dashData?.pendingInvites ?? 0), icon: Link2, href: '/cases', color: '#3B82F6' },
    { title: 'Upcoming Deadlines', value: String(dashData?.upcomingDeadlines?.length ?? 0), icon: AlertTriangle, href: '/tasks', color: '#EF4444' },
    { title: 'Unbilled Hours', value: dashData ? formatDuration(dashData.unbilledHours) : '—', icon: Clock, href: '/billing', color: '#8B5CF6' },
    { title: 'Outstanding Balance', value: dashData ? formatCurrency(dashData.outstandingBalance) : '—', icon: DollarSign, href: '/billing', color: '#F59E0B' },
    { title: 'Collected YTD', value: dashData ? formatCurrency(dashData.collectedYTD) : '—', icon: TrendingUp, href: '/billing', color: '#10B981' },
  ]

  // Tasks: overdue + due within 7 days
  const overdueTasks = (dashData?.upcomingDeadlines ?? []).filter(d => d.is_overdue)
  const dueSoonTasks = (dashData?.upcomingDeadlines ?? []).filter(d => !d.is_overdue && d.days_until <= 7)
  const tasksList = [...overdueTasks, ...dueSoonTasks].slice(0, 8)

  // Schedule: group by date
  const scheduleByDate = useMemo(() => {
    const items = dashData?.upcomingSchedule ?? []
    const groups: Record<string, ScheduleItem[]> = {}
    for (const item of items) {
      const date = item.date?.split('T')[0] || 'Unknown'
      if (!groups[date]) groups[date] = []
      groups[date].push(item)
    }
    return groups
  }, [dashData?.upcomingSchedule])

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Dashboard"
        description="Expert witness practice command center"
      />

      {/* Stat Cards — 6 across */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <div className="bg-white border border-[#D8DCE3] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-center justify-between mb-2">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="h-4.5 w-4.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: '#0E1F35' }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#8892A2' }}>{stat.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Row 2: Cases, Schedule, Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Cases (includes new inquiries) */}
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <WidgetHeader title="Recent Cases" href="/cases" />
          <div className="divide-y" style={{ borderColor: '#F0F1F4' }}>
            {activeCases.length === 0 ? (
              <div className="p-5 text-sm text-neutral-500">No cases yet</div>
            ) : (
              activeCases.slice(0, 6).map((c) => {
                const activity = dashData?.caseActivity?.[c.id]
                return (
                  <Link key={c.id} href={`/cases/${c.id}`} className="block px-5 py-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-800 truncate flex-1">{c.case_name}</p>
                      <StatusBadge
                        label={getLabelForValue(CASE_STATUSES, c.status)}
                        color={getColorForValue(CASE_STATUSES, c.status)}
                      />
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">{c.case_number}</p>
                    {activity && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Activity className="h-3 w-3 text-[#DFC06A]" />
                        <span className="text-xs text-neutral-500 truncate">{activity.description}</span>
                        <span className="text-xs text-neutral-400 shrink-0">{getRelativeTime(activity.timestamp)}</span>
                      </div>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Schedule — Next 7 Days */}
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <WidgetHeader title="Upcoming Schedule" href="/calendar" linkText="Calendar" />
          <div className="divide-y" style={{ borderColor: '#F0F1F4' }}>
            {Object.keys(scheduleByDate).length === 0 ? (
              <div className="p-5 text-sm text-neutral-500">No upcoming events</div>
            ) : (
              Object.entries(scheduleByDate).slice(0, 5).map(([date, items]) => {
                const d = new Date(date + 'T12:00:00')
                const isToday = d.toDateString() === new Date().toDateString()
                const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString()
                const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

                return (
                  <div key={date} className="px-5 py-3">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      {dateLabel}
                    </p>
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 py-1">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.type === 'milestone' ? '#DFC06A' : '#0E1F35' }}
                        />
                        <span className="text-sm text-neutral-800 truncate flex-1">{item.title}</span>
                        {item.caseName && (
                          <span className="text-[10px] text-neutral-400 shrink-0">{item.caseName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <WidgetHeader title="Tasks & Deadlines" href="/tasks" />
          <div className="divide-y" style={{ borderColor: '#F0F1F4' }}>
            {tasksList.length === 0 ? (
              <div className="p-5 text-sm text-neutral-500">No upcoming tasks</div>
            ) : (
              tasksList.map((task) => (
                <div key={task.id} className="px-5 py-2.5 flex items-start gap-2">
                  <Checkbox
                    className="mt-0.5"
                    onCheckedChange={() => toggleMilestone.mutate({ id: task.id, caseId: task.case_id })}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-800 leading-tight">{task.milestone_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium ${task.is_overdue ? 'text-red-500' : task.days_until <= 3 ? 'text-amber-600' : 'text-neutral-400'}`}>
                        {task.is_overdue
                          ? `${Math.abs(task.days_until)}d overdue`
                          : task.days_until === 0
                            ? 'Today'
                            : task.days_until === 1
                              ? 'Tomorrow'
                              : `${task.days_until}d`
                        }
                      </span>
                      {task.case_name && (
                        <span className="text-[10px] text-neutral-400 truncate">{task.case_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Financial + Portal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial Summary */}
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <WidgetHeader title="Financial Summary" href="/billing" linkText="Billing" />
          <div className="p-5 space-y-4">
            {/* Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">Outstanding Invoices</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: '#0E1F35' }}>
                  {formatCurrency(dashData?.invoiceBalance ?? 0)}
                  <span className="text-xs text-neutral-400 ml-1">({dashData?.outstandingInvoices?.length ?? 0})</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">Unbilled Time</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: '#0E1F35' }}>
                  {formatCurrency(dashData?.unbilledAmount ?? 0)}
                  <span className="text-xs text-neutral-400 ml-1">({formatDuration(dashData?.unbilledHours ?? 0)})</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">Unbilled Charges</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: '#0E1F35' }}>
                  {formatCurrency(dashData?.chargesBalance ?? 0)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ color: '#0E1F35' }}>Total Outstanding</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: '#DFC06A' }}>
                  {formatCurrency(dashData?.outstandingBalance ?? 0)}
                </span>
              </div>
            </div>

            {/* Outstanding Invoices List */}
            {(dashData?.outstandingInvoices ?? []).length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Open Invoices</p>
                {dashData!.outstandingInvoices.slice(0, 4).map((inv) => (
                  <Link key={inv.id} href={`/billing/invoices/${inv.id}`} className="flex items-center justify-between py-1.5 hover:bg-neutral-50 -mx-2 px-2 rounded">
                    <div>
                      <span className="text-xs font-mono text-neutral-600">{inv.invoiceNumber}</span>
                      {inv.caseName && <span className="text-xs text-neutral-400 ml-2">{inv.caseName}</span>}
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-amber-600">{formatCurrency(inv.balanceDue)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity drawer for clicked portal invite */}
        <PortalActivityDrawer
          inviteId={activeInvite?.id ?? null}
          contactName={activeInvite?.contactName}
          open={!!activeInvite}
          onOpenChange={(open) => { if (!open) setActiveInvite(null) }}
        />

        {/* Portal & Invites */}
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <WidgetHeader title="Portal Invites" href="/cases" linkText="Cases" />
          <div className="divide-y" style={{ borderColor: '#F0F1F4' }}>
            {(dashData?.portalInvites ?? []).length === 0 ? (
              <div className="p-5 text-sm text-neutral-500">No active portal invites</div>
            ) : (
              dashData!.portalInvites.slice(0, 6).map((invite) => (
                <div key={invite.id} className="px-5 py-3 hover:bg-neutral-50 group">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveInvite(invite)}
                      className="min-w-0 flex-1 text-left"
                      title="View login history & activity"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-800 truncate group-hover:text-[#0E1F35]">{invite.contactName}</p>
                        {inviteStatusBadge(invite.status)}
                      </div>
                      {invite.organization && (
                        <p className="text-xs text-neutral-400">{invite.organization}</p>
                      )}
                      {invite.caseName && (
                        <p className="text-xs text-neutral-500 mt-0.5">{invite.caseName}</p>
                      )}
                    </button>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        {invite.viewCount > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-neutral-400">
                            <Eye className="h-3 w-3" />
                            {invite.viewCount}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-neutral-400">
                            <Send className="h-3 w-3" />
                            {getRelativeTime(invite.createdAt)}
                          </div>
                        )}
                        {invite.onboardingProgress && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Steps: {invite.onboardingProgress}
                          </p>
                        )}
                      </div>
                      {invite.token && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/portal/${invite.token}?preview=1`, '_blank', 'noopener,noreferrer')
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-[#0E1F35] p-1"
                          title="View as recipient"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
