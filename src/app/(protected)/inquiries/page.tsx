'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ClipboardList, ArrowRight, Archive, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Inquiry {
  id: string
  contact_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  organization_name: string | null
  case_description: string | null
  case_type: string | null
  specialty_area: string | null
  side: string | null
  requested_turnaround: string | null
  source: string | null
  status: string
  case_id: string | null
  converted_at: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
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

export default function InquiriesPage() {
  const searchParams = useSearchParams()
  const highlight = searchParams.get('highlight')

  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all' | 'converted'>('open')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('consultation_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter === 'open') {
      query = query.in('status', ['new', 'reviewed'])
    } else if (filter === 'converted') {
      query = query.eq('status', 'converted')
    }

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load inquiries')
      console.error(error)
    } else {
      setInquiries(data || [])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function handleConvert(inquiry: Inquiry) {
    if (!confirm(`Convert this inquiry into an active case for ${inquiry.first_name} ${inquiry.last_name}?`)) return
    setConvertingId(inquiry.id)
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}/convert`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Convert failed')
      toast.success(`Case ${data.caseNumber} created`)
      if (data.caseId) {
        window.location.href = `/cases/${data.caseId}`
      } else {
        load()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Convert failed')
    } finally {
      setConvertingId(null)
    }
  }

  async function handleStatus(id: string, status: string) {
    const { error } = await supabase
      .from('consultation_requests')
      .update({ status })
      .eq('id', id)
    if (error) {
      toast.error('Update failed')
    } else {
      load()
    }
  }

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description="Consultation requests from the public SEAK directory and other inbound channels. Nothing here is a case yet — review, respond, and convert when you're ready."
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
      ) : inquiries.length === 0 ? (
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
          {inquiries.map((inq) => {
            const isHighlighted = inq.id === highlight
            const isConverted = inq.status === 'converted'
            return (
              <div
                key={inq.id}
                className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
                  isHighlighted ? 'border-[#DFC06A] shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="px-6 py-4 flex items-start justify-between gap-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-[#0E1F35]">
                        {inq.first_name} {inq.last_name}
                      </h3>
                      <Badge className={STATUS_STYLES[inq.status] || 'bg-gray-100'}>{humanize(inq.status)}</Badge>
                      {inq.source && inq.source !== 'direct' && (
                        <span className="text-[10px] font-semibold text-[#DFC06A] tracking-widest uppercase">
                          via {inq.source}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {inq.organization_name ? `${inq.organization_name} • ` : ''}
                      <a href={`mailto:${inq.email}`} className="hover:underline">{inq.email}</a>
                      {inq.phone && <> • {inq.phone}</>}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(inq.created_at)}</p>
                </div>

                <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Case Type</p>
                    <p className="text-gray-800">{humanize(inq.case_type)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Side</p>
                    <p className="text-gray-800">{humanize(inq.side)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Clinical Area</p>
                    <p className="text-gray-800">{humanize(inq.specialty_area)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Turnaround</p>
                    <p className="text-gray-800">{humanize(inq.requested_turnaround)}</p>
                  </div>
                </div>

                {inq.case_description && (
                  <div className="px-6 pb-4">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {inq.case_description}
                    </p>
                  </div>
                )}

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                  {isConverted && inq.case_id ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/cases/${inq.case_id}`}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Case
                      </a>
                    </Button>
                  ) : (
                    <>
                      {inq.status === 'new' && (
                        <Button variant="ghost" size="sm" onClick={() => handleStatus(inq.id, 'reviewed')}>
                          Mark Reviewed
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleStatus(inq.id, 'archived')}>
                        <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
                      </Button>
                      <Button
                        size="sm"
                        disabled={convertingId === inq.id}
                        onClick={() => handleConvert(inq)}
                      >
                        {convertingId === inq.id ? 'Converting...' : (
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
