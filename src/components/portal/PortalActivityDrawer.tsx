'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Monitor, Globe, Smartphone, ChevronRight, Activity as ActivityIcon } from 'lucide-react'

interface AccessLogRow {
  id: string
  accessed_at: string
  session_id: string
  ip_address: string | null
  user_agent: string | null
  referrer: string | null
}

interface ActivityLogRow {
  id: string
  event_type: string
  event_data: Record<string, unknown> | null
  session_id: string | null
  occurred_at: string
}

interface ActivityData {
  invite: {
    id: string
    token: string
    view_count: number
    first_accessed_at: string | null
    last_accessed_at: string | null
    created_at: string
    expires_at: string
    onboarding_completed_at: string | null
    contacts?: { first_name?: string; last_name?: string; email?: string }
  }
  summary: {
    totalSessions: number
    totalAccessLogEntries: number
    uniqueDaysAccessed: number
    firstAccessedAt: string | null
    lastAccessedAt: string | null
  }
  accessLog: AccessLogRow[]
  activityLog: ActivityLogRow[]
}

interface Props {
  inviteId: string | null
  contactName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function shortSession(id: string) {
  return id.slice(0, 8)
}

function deviceFromUA(ua: string | null) {
  if (!ua) return { label: 'Unknown', Icon: Monitor }
  if (/iPhone|Android.*Mobile/i.test(ua)) return { label: 'Mobile', Icon: Smartphone }
  if (/iPad|Tablet/i.test(ua)) return { label: 'Tablet', Icon: Smartphone }
  return { label: 'Desktop', Icon: Monitor }
}

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Viewed page',
  feature_opened: 'Opened feature',
  doc_viewed: 'Viewed document',
  doc_uploaded: 'Uploaded document',
  message_sent: 'Sent message',
  message_read: 'Read message',
  step_completed: 'Completed step',
  contract_signed: 'Signed contract',
  payment_made: 'Made payment',
  report_opened: 'Opened report',
  fee_schedule_viewed: 'Viewed fee schedule',
  cv_viewed: 'Viewed CV',
  case_details_updated: 'Updated case details',
}

function labelForEvent(row: ActivityLogRow) {
  const base = EVENT_LABELS[row.event_type] || row.event_type.replace(/_/g, ' ')
  const detail =
    row.event_data && typeof row.event_data === 'object'
      ? (row.event_data as Record<string, unknown>).label ||
        (row.event_data as Record<string, unknown>).path ||
        (row.event_data as Record<string, unknown>).name
      : null
  return detail ? `${base} — ${detail}` : base
}

export function PortalActivityDrawer({ inviteId, contactName, open, onOpenChange }: Props) {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !inviteId) return
    setLoading(true)
    setError(null)
    setData(null)
    fetch(`/api/portal/invites/${inviteId}/activity`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load activity')
        return res.json()
      })
      .then((d: ActivityData) => setData(d))
      .catch((e) => setError(e.message || 'Failed to load activity'))
      .finally(() => setLoading(false))
  }, [open, inviteId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader className="mb-4 space-y-1">
          <SheetTitle className="text-[#0E1F35]">
            <ActivityIcon className="h-5 w-5 inline mr-2 text-[#DFC06A]" />
            Portal Activity
          </SheetTitle>
          <SheetDescription>
            {contactName ? `Full login and activity history for ${contactName}.` : 'Full login and activity history.'}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#0E1F35]" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Views" value={String(data.invite.view_count)} />
              <Stat label="Sessions" value={String(data.summary.totalSessions)} />
              <Stat label="Days" value={String(data.summary.uniqueDaysAccessed)} />
              <Stat
                label="Last"
                value={data.summary.lastAccessedAt ? formatDateTime(data.summary.lastAccessedAt).split(',')[0] : '—'}
              />
            </div>

            <Tabs defaultValue="logins">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="logins">Logins ({data.accessLog.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity ({data.activityLog.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="logins" className="mt-3">
                {data.accessLog.length === 0 ? (
                  <EmptyState text="No logins recorded yet." />
                ) : (
                  <div className="divide-y border rounded-md">
                    {data.accessLog.map((row) => {
                      const device = deviceFromUA(row.user_agent)
                      const Icon = device.Icon
                      return (
                        <div key={row.id} className="p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="font-medium text-gray-800 truncate">
                                {formatDateTime(row.accessed_at)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 font-mono shrink-0 ml-2">
                              {shortSession(row.session_id)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                            {row.ip_address && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {row.ip_address}
                              </span>
                            )}
                            <span>{device.label}</span>
                            {row.user_agent && (
                              <span className="truncate max-w-[240px]" title={row.user_agent}>
                                {row.user_agent.slice(0, 48)}
                                {row.user_agent.length > 48 ? '…' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-3">
                {data.activityLog.length === 0 ? (
                  <EmptyState text="No activity events recorded yet. Activity events fire as the recipient uses the portal." />
                ) : (
                  <div className="divide-y border rounded-md">
                    {data.activityLog.map((row) => (
                      <div key={row.id} className="p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ChevronRight className="h-4 w-4 text-[#DFC06A] shrink-0" />
                            <span className="text-gray-800 truncate">{labelForEvent(row)}</span>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0 ml-2">
                            {formatDateTime(row.occurred_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border rounded-md p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-[#0E1F35] truncate">{value}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-sm text-gray-500 bg-gray-50 border rounded-md p-4 text-center">
      {text}
    </div>
  )
}
