'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ClipboardList, ArrowRight, Archive, ExternalLink, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/api-client'

interface ContactRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_primary: string | null
  organization_name: string | null
}

interface CaseContactRow {
  is_primary: boolean | null
  contacts: ContactRow | null
}

interface PortalInviteRow {
  id: string
  token: string | null
  is_active: boolean | null
}

interface InquiryCaseRow {
  id: string
  case_number: string | null
  case_name: string | null
  status: string
  case_type: string | null
  side: string | null
  specialty_area: string | null
  brief_summary: string | null
  requested_turnaround: string | null
  inquiry_source: string | null
  inquiry_metadata: Record<string, unknown> | null
  created_at: string
  case_contacts: CaseContactRow[] | null
  portal_invites: PortalInviteRow[] | null
}

const REVIEW_STATE_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-900',
  reviewed: 'bg-sky-100 text-sky-900',
  converted: 'bg-emerald-100 text-emerald-900',
  declined: 'bg-gray-200 text-gray-700',
  archived: 'bg-gray-100 text-gray-500',
}

function humanize(v: string | null | undefined) {
  if (!v) return '—'
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function reviewState(row: InquiryCaseRow): string {
  const meta = row.inquiry_metadata as { review_state?: string } | null
  return meta?.review_state || 'new'
}

function primaryContact(row: InquiryCaseRow): ContactRow | null {
  const link = row.case_contacts?.find((cc) => cc.is_primary) || row.case_contacts?.[0]
  return link?.contacts || null
}

function activeInvite(row: InquiryCaseRow): PortalInviteRow | null {
  return row.portal_invites?.find((pi) => pi.is_active) || row.portal_invites?.[0] || null
}

export default function InquiriesPage() {
  const searchParams = useSearchParams()
  const highlight = searchParams.get('highlight')

  const [rows, setRows] = useState<InquiryCaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all' | 'converted'>('open')

  const load = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('cases')
      .select(`
        id, case_number, case_name, status, case_type, side, specialty_area,
        brief_summary, requested_turnaround, inquiry_source, inquiry_metadata, created_at,
        case_contacts ( is_primary, contacts ( id, first_name, last_name, email, phone_primary, organization_name ) ),
        portal_invites ( id, token, is_active )
      `)
      .order('created_at', { ascending: false })

    if (filter === 'open') {
      query = query.eq('status', 'inquiry')
    } else if (filter === 'converted') {
      query = query.in('status', ['accepted', 'active', 'conflict_check'])
    } else {
      // all: cases that came in as inquiries (have review_state metadata)
      // Supabase JSON filter: inquiry_metadata->>review_state IS NOT NULL
      query = query.not('inquiry_metadata->>review_state', 'is', null)
    }

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load inquiries')
      console.error(error)
    } else {
      setRows((data || []) as unknown as InquiryCaseRow[])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function handleConvert(row: InquiryCaseRow) {
    const contact = primaryContact(row)
    const name = contact ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() : row.case_name || 'this inquiry'
    if (!confirm(`Convert ${name} into an active case?`)) return

    setConvertingId(row.id)
    try {
      const res = await fetch(`/api/inquiries/${row.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ targetStatus: 'accepted' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Convert failed')
      toast.success(`Case ${data.caseNumber} accepted`)
      window.location.href = `/cases/${data.caseId}`
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Convert failed')
    } finally {
      setConvertingId(null)
    }
  }

  async function handleMarkReviewed(row: InquiryCaseRow) {
    const meta = (row.inquiry_metadata as Record<string, unknown> | null) || {}
    const next = { ...meta, review_state: 'reviewed' }
    const { error } = await supabase
      .from('cases')
      .update({ inquiry_metadata: next })
      .eq('id', row.id)
    if (error) {
      toast.error('Update failed')
    } else {
      load()
    }
  }

  async function handleArchive(row: InquiryCaseRow) {
    if (!confirm('Archive this inquiry? It will be marked as withdrawn.')) return
    const { error } = await supabase
      .from('cases')
      .update({ status: 'withdrawn' })
      .eq('id', row.id)
    if (error) {
      toast.error('Archive failed')
    } else {
      load()
    }
  }

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description="All inbound inquiries — public consult form, SEAK leads, and manually-entered prospects. Review, respond, and convert when you're ready."
      />

      <div className="flex gap-2 mb-4">
        {(['open', 'converted', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              filter === f ? 'bg-[#0E1F35] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'open' ? 'Open' : f === 'converted' ? 'Converted' : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No inquiries"
          description={
            filter === 'open'
              ? 'You have no open inquiries. New submissions from the public consult form will appear here.'
              : 'No inquiries match this filter.'
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const isHighlighted = row.id === highlight
            const isOpen = row.status === 'inquiry'
            const contact = primaryContact(row)
            const invite = activeInvite(row)
            const state = reviewState(row)
            const displayState = isOpen ? state : row.status

            return (
              <div
                key={row.id}
                className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
                  isHighlighted ? 'border-[#DFC06A] shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="px-6 py-4 flex items-start justify-between gap-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-[#0E1F35]">
                        {contact ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() : row.case_name}
                      </h3>
                      <Badge className={REVIEW_STATE_STYLES[displayState] || 'bg-gray-100'}>
                        {humanize(displayState)}
                      </Badge>
                      {row.inquiry_source && row.inquiry_source !== 'direct' && (
                        <span className="text-[10px] font-semibold text-[#DFC06A] tracking-widest uppercase">
                          via {row.inquiry_source}
                        </span>
                      )}
                      {row.case_number && (
                        <span className="text-xs text-gray-400">{row.case_number}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {contact?.organization_name ? `${contact.organization_name} • ` : ''}
                      {contact?.email && (
                        <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                      )}
                      {contact?.phone_primary && <> • {contact.phone_primary}</>}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(row.created_at)}</p>
                </div>

                <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Case Type</p>
                    <p className="text-gray-800">{humanize(row.case_type)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Side</p>
                    <p className="text-gray-800">{humanize(row.side)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Clinical Area</p>
                    <p className="text-gray-800">{humanize(row.specialty_area)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Turnaround</p>
                    <p className="text-gray-800">{humanize(row.requested_turnaround)}</p>
                  </div>
                </div>

                {row.brief_summary && (
                  <div className="px-6 pb-4">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {row.brief_summary}
                    </p>
                  </div>
                )}

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                  {!isOpen ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/cases/${row.id}`}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Case
                      </a>
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/cases/${row.id}/messages`}>
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Reply
                        </a>
                      </Button>
                      {invite?.token && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/portal/${invite.token}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Portal
                          </a>
                        </Button>
                      )}
                      {state === 'new' && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkReviewed(row)}>
                          Mark Reviewed
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(row)}>
                        <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
                      </Button>
                      <Button
                        size="sm"
                        disabled={convertingId === row.id}
                        onClick={() => handleConvert(row)}
                      >
                        {convertingId === row.id ? 'Converting...' : (
                          <>Convert to Case <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
