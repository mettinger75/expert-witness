'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { PortalView } from './PortalView'
import { PortalLinkRecovery } from './PortalLinkRecovery'
import { Loader2, AlertTriangle } from 'lucide-react'

interface PortalInvite {
  id: string
  case_id: string
  contact_id: string
  token: string
  can_view_summary: boolean
  can_view_timeline: boolean
  can_message: boolean
  can_view_reports: boolean
  can_edit_reports: boolean
  can_upload_documents: boolean
  can_view_fee_schedule: boolean
  can_view_depositions: boolean
  can_view_billing: boolean
  can_book_scheduling: boolean
  can_sign_contract: boolean
  contract_id: string | null
  onboarding_mode: boolean
  onboarding_steps: Record<string, string> | null
  expires_at: string
  view_count: number
  tutorial_completed_at: string | null
  onboarding_completed_at: string | null
  contact: {
    id: string
    first_name: string
    last_name: string
    email: string
    organization_name?: string
    contact_type: string
  } | null
}

interface ContractStatusInfo {
  id: string
  status: string
  signedAt: string | null
  title: string
}

interface CaseData {
  id: string
  case_name: string
  case_number: string
  status: string
  priority: string
  side: string
  case_type: string
  specialty_area: string
  brief_summary: string
  key_issues: string | string[] | null
  patient_name: string
  patient_dob: string | null
  patient_age_at_incident: number | null
  date_of_incident: string | null
  date_of_referral: string | null
  jurisdiction_state: string | null
  jurisdiction_court: string | null
}

interface CaseContact {
  id: string
  role: string
  is_primary: boolean
  contacts: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone_primary: string | null
    organization_name: string | null
    contact_type: string
  }
}

interface CaseReport {
  id: string
  report_name: string
  report_type: string
  status: string
  version: number
  is_latest_version: boolean
  created_at: string
  updated_at: string
}

interface Communication {
  id: string
  communication_type: string
  subject: string | null
  summary: string | null
  communication_date: string
  direction: string
  participants: string | null
  notes: string | null
}

interface FeeScheduleItem {
  activity_type: string
  description: string
  rate_per_hour: number
  flat_fee: number | null
  daily_rate: number | null
}

interface DepositionPortalItem {
  id: string
  deponent_name: string
  deponent_role: string
  deposition_date: string
  deposition_location: string | null
  status: string
  is_video_recorded: boolean
  duration_hours: number | null
  summary: string | null
  ai_summary: string | null
  key_admissions: string[] | null
}

interface PortalData {
  invite: PortalInvite
  caseData: CaseData
  caseContacts: CaseContact[]
  caseReports: CaseReport[]
  communications: Communication[]
  feeSchedule: FeeScheduleItem[]
  depositions: DepositionPortalItem[]
  unreadCount: number
  contractStatus: ContractStatusInfo | null
}

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PortalData | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/${token}`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Portal not found')
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setError('Failed to load portal')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E1F35]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Portal Unavailable</h2>
        <p className="text-gray-600">
          {error || 'This portal link is no longer valid.'}
        </p>
        <PortalLinkRecovery />
      </div>
    )
  }

  return (
    <PortalView
      token={token}
      invite={data.invite}
      caseData={data.caseData}
      caseContacts={data.caseContacts}
      caseReports={data.caseReports}
      communications={data.communications}
      feeSchedule={data.feeSchedule}
      depositions={data.depositions}
      initialUnreadCount={data.unreadCount}
      contractStatus={data.contractStatus}
    />
  )
}
