'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FileText,
  MessageSquare,
  ClipboardList,
  Clock,
  Upload,
  DollarSign,
  Gavel,
} from 'lucide-react'
import { PortalSummary } from './PortalSummary'
import { PortalTimeline } from './PortalTimeline'
import { PortalMessages } from './PortalMessages'
import { PortalReports } from './PortalReports'
import { PortalDocuments } from './PortalDocuments'
import { PortalFeeSchedule } from './PortalFeeSchedule'
import { PortalDepositions } from './PortalDepositions'

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
  expires_at: string
  view_count: number
  contact: {
    id: string
    first_name: string
    last_name: string
    email: string
    organization_name?: string
    contact_type: string
  } | null
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

interface SharedReport {
  id: string
  entity_id: string
  token: string
  is_active: boolean
  reports: {
    id: string
    report_name: string
    status: string
    created_at: string
    updated_at: string
  } | null
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

interface TabConfig {
  id: string
  label: string
  icon: React.ReactNode
  enabled: boolean
}

interface FeeScheduleItem {
  activity_type: string
  description: string
  rate_per_hour: number
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

interface PortalViewProps {
  token: string
  invite: PortalInvite
  caseData: CaseData
  caseContacts: CaseContact[]
  sharedReports: SharedReport[]
  communications: Communication[]
  feeSchedule: FeeScheduleItem[]
  depositions: DepositionPortalItem[]
  initialUnreadCount: number
}

export function PortalView({
  token,
  invite,
  caseData,
  caseContacts,
  sharedReports,
  communications,
  feeSchedule,
  depositions,
  initialUnreadCount,
}: PortalViewProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [showWelcome, setShowWelcome] = useState(invite.view_count === 1)

  const tabs: TabConfig[] = [
    {
      id: 'summary',
      label: 'Summary',
      icon: <ClipboardList className="h-4 w-4" />,
      enabled: invite.can_view_summary,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: <Clock className="h-4 w-4" />,
      enabled: invite.can_view_timeline,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: <MessageSquare className="h-4 w-4" />,
      enabled: invite.can_message,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText className="h-4 w-4" />,
      enabled: invite.can_view_reports,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <Upload className="h-4 w-4" />,
      enabled: invite.can_upload_documents,
    },
    {
      id: 'fee-schedule',
      label: 'Fee Schedule',
      icon: <DollarSign className="h-4 w-4" />,
      enabled: invite.can_view_fee_schedule,
    },
    {
      id: 'depositions',
      label: 'Depositions',
      icon: <Gavel className="h-4 w-4" />,
      enabled: invite.can_view_depositions,
    },
  ]

  const enabledTabs = tabs.filter((t) => t.enabled)
  const [activeTab, setActiveTab] = useState(enabledTabs[0]?.id || 'summary')

  const contactName = invite.contact
    ? `${invite.contact.first_name} ${invite.contact.last_name}`
    : 'Attorney'

  return (
    <div>
      {/* Welcome Dialog (first visit) */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to Your Case Portal</DialogTitle>
            <DialogDescription>
              Welcome, {contactName}. This portal gives you secure access to
              case information for <strong>{caseData.case_name}</strong> (
              {caseData.case_number}).
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-2">
            <p>From this portal you can:</p>
            <ul className="list-disc list-inside space-y-1">
              {invite.can_view_summary && <li>View the case summary</li>}
              {invite.can_view_timeline && (
                <li>Review the communication timeline</li>
              )}
              {invite.can_message && (
                <li>Send and receive secure messages</li>
              )}
              {invite.can_view_reports && <li>Access shared reports</li>}
              {invite.can_upload_documents && (
                <li>Upload documents and records</li>
              )}
              {invite.can_view_fee_schedule && (
                <li>View the fee schedule</li>
              )}
              {invite.can_view_depositions && (
                <li>Review depositions</li>
              )}
            </ul>
            {invite.can_upload_documents && (
              <p className="mt-3 text-[#0E1F35] font-medium">
                If you have medical records or other documents to share, please
                use the Documents tab to upload them.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowWelcome(false)
                if (invite.can_upload_documents) {
                  setActiveTab('documents')
                }
              }}
              className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
            >
              {invite.can_upload_documents
                ? 'Upload Documents'
                : 'Get Started'}
            </Button>
            <Button variant="outline" onClick={() => setShowWelcome(false)}>
              Explore Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0E1F35]">
          {caseData.case_name}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {caseData.case_number} &middot; Portal for {contactName}
          {invite.contact?.organization_name &&
            ` (${invite.contact.organization_name})`}
        </p>
      </div>

      {/* Tab navigation - Meridian style */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px" aria-label="Portal tabs">
          {enabledTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-[#C9A84C] text-[#0E1F35]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="ml-1 bg-[#C9A84C] text-[#0E1F35] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'summary' && (
          <PortalSummary caseData={caseData} caseContacts={caseContacts} />
        )}
        {activeTab === 'timeline' && (
          <PortalTimeline communications={communications} />
        )}
        {activeTab === 'messages' && (
          <PortalMessages
            token={token}
            onUnreadChange={setUnreadCount}
          />
        )}
        {activeTab === 'reports' && (
          <PortalReports
            sharedReports={sharedReports}
            canEdit={invite.can_edit_reports}
          />
        )}
        {activeTab === 'documents' && <PortalDocuments token={token} />}
        {activeTab === 'fee-schedule' && (
          <PortalFeeSchedule feeSchedule={feeSchedule} />
        )}
        {activeTab === 'depositions' && (
          <PortalDepositions depositions={depositions} />
        )}
      </div>
    </div>
  )
}
