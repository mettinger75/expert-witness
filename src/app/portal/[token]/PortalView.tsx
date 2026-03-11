'use client'

import { useState, useCallback } from 'react'
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
  FileSignature,
  HelpCircle,
  Receipt,
  CalendarClock,
} from 'lucide-react'
import { PortalSummary } from './PortalSummary'
import { PortalTimeline } from './PortalTimeline'
import { PortalMessages } from './PortalMessages'
import { PortalReports } from './PortalReports'
import { PortalDocuments } from './PortalDocuments'
import { PortalFeeSchedule } from './PortalFeeSchedule'
import { PortalDepositions } from './PortalDepositions'
import { PortalBilling } from './PortalBilling'
import { PortalBooking } from './PortalBooking'
import { PortalContract } from './PortalContract'
import { PortalOnboarding } from './PortalOnboarding'
import { PortalTutorial } from './PortalTutorial'

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

interface ContractStatus {
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

interface PortalViewProps {
  token: string
  invite: PortalInvite
  caseData: CaseData
  caseContacts: CaseContact[]
  caseReports: CaseReport[]
  communications: Communication[]
  feeSchedule: FeeScheduleItem[]
  depositions: DepositionPortalItem[]
  initialUnreadCount: number
  contractStatus: ContractStatus | null
}

export function PortalView({
  token,
  invite,
  caseData,
  caseContacts,
  caseReports,
  communications,
  feeSchedule,
  depositions,
  initialUnreadCount,
  contractStatus,
}: PortalViewProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [showWelcome, setShowWelcome] = useState(invite.view_count === 1 && !invite.onboarding_mode)
  const [contractSigned, setContractSigned] = useState(contractStatus?.status === 'signed')
  const [showOnboarding, setShowOnboarding] = useState(invite.onboarding_mode && !invite.onboarding_completed_at)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialCompleted, setTutorialCompleted] = useState(!!invite.tutorial_completed_at)

  const launchTutorial = useCallback(() => {
    if (!tutorialCompleted) {
      setTimeout(() => setShowTutorial(true), 500)
    }
  }, [tutorialCompleted])

  const tabs: TabConfig[] = [
    {
      id: 'contract',
      label: 'Contract',
      icon: <FileSignature className="h-4 w-4" />,
      enabled: invite.can_sign_contract && !!invite.contract_id,
    },
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
      id: 'billing',
      label: 'Billing',
      icon: <Receipt className="h-4 w-4" />,
      enabled: invite.can_view_billing,
    },
    {
      id: 'depositions',
      label: 'Depositions',
      icon: <Gavel className="h-4 w-4" />,
      enabled: invite.can_view_depositions,
    },
    {
      id: 'booking',
      label: 'Booking',
      icon: <CalendarClock className="h-4 w-4" />,
      enabled: invite.can_book_scheduling,
    },
  ]

  const enabledTabs = tabs.filter((t) => t.enabled)
  const [activeTab, setActiveTab] = useState(enabledTabs[0]?.id || 'summary')

  const contactName = invite.contact
    ? `${invite.contact.first_name} ${invite.contact.last_name}`
    : 'Attorney'

  // Onboarding mode: show guided stepper instead of tabs
  if (showOnboarding) {
    type StepStatus = 'pending' | 'completed' | 'locked' | 'not_applicable'
    const onboardingSteps = (invite.onboarding_steps || {
      review_fee_schedule: 'pending',
      review_cv: 'locked',
      enter_case_details: 'locked',
      schedule_call: 'locked',
      sign_contract: 'locked',
      retainer_payment: 'locked',
      upload_documents: 'locked',
    }) as {
      review_fee_schedule: StepStatus
      review_cv: StepStatus
      enter_case_details: StepStatus
      schedule_call?: StepStatus
      sign_contract: StepStatus
      retainer_payment: StepStatus
      upload_documents: StepStatus
    }

    const isInquiry = caseData.status === 'inquiry'

    return (
      <div>
        {/* Case header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-[#0E1F35] text-white px-4 py-1.5 rounded-full text-sm mb-3">
            <span className="text-[#C9A84C] font-medium">Case Portal</span>
            <span className="text-white/40">|</span>
            <span>{caseData.case_number}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0E1F35]">
            {isInquiry ? 'Expert Witness Consultation' : caseData.case_name}
          </h1>
        </div>

        <PortalOnboarding
          token={token}
          caseName={caseData.case_name}
          contactName={contactName}
          initialSteps={onboardingSteps}
          feeSchedule={feeSchedule}
          onComplete={() => {
            setShowOnboarding(false)
            // Persist onboarding completion
            fetch(`/api/portal/${token}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ onboardingCompleted: true }),
            }).catch(() => {})
            launchTutorial()
          }}
        />
      </div>
    )
  }

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
              {invite.can_sign_contract && invite.contract_id && (
                <li className="font-medium text-[#0E1F35]">Review and sign the retention agreement</li>
              )}
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
              {invite.can_view_billing && (
                <li>View invoices and billing</li>
              )}
              {invite.can_view_fee_schedule && (
                <li>View the fee schedule</li>
              )}
              {invite.can_view_depositions && (
                <li>Review depositions</li>
              )}
              {invite.can_book_scheduling && (
                <li>Book expert calls and depositions</li>
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
                if (invite.can_sign_contract && invite.contract_id && !contractSigned) {
                  setActiveTab('contract')
                } else if (invite.can_upload_documents) {
                  setActiveTab('documents')
                }
                launchTutorial()
              }}
              className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
            >
              {invite.can_sign_contract && invite.contract_id && !contractSigned
                ? 'Review & Sign Agreement'
                : invite.can_upload_documents
                  ? 'Upload Documents'
                  : 'Get Started'}
            </Button>
            <Button variant="outline" onClick={() => {
              setShowWelcome(false)
              launchTutorial()
            }}>
              Explore Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0E1F35]">
            {caseData.case_name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {caseData.case_number} &middot; Portal for {contactName}
            {invite.contact?.organization_name &&
              ` (${invite.contact.organization_name})`}
          </p>
        </div>
        <button
          onClick={() => setShowTutorial(true)}
          className="text-gray-400 hover:text-[#C9A84C] transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          title="Portal tutorial"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Tab navigation - Meridian style */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px" aria-label="Portal tabs" data-tour="portal-tabs">
          {enabledTabs.map((tab) => (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
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
              {tab.id === 'contract' && !contractSigned && (
                <span className="ml-1 w-2 h-2 rounded-full bg-[#C9A84C]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'contract' && (
          <PortalContract
            token={token}
            onSigned={() => setContractSigned(true)}
          />
        )}
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
            token={token}
            caseReports={caseReports}
          />
        )}
        {activeTab === 'documents' && <PortalDocuments token={token} />}
        {activeTab === 'billing' && <PortalBilling token={token} />}
        {activeTab === 'fee-schedule' && (
          <PortalFeeSchedule feeSchedule={feeSchedule} />
        )}
        {activeTab === 'depositions' && (
          <PortalDepositions depositions={depositions} />
        )}
        {activeTab === 'booking' && <PortalBooking />}
      </div>

      {/* Spotlight Tutorial */}
      {showTutorial && (
        <PortalTutorial
          token={token}
          enabledTabs={enabledTabs.map((t) => t.id)}
          onSwitchTab={(tabId) => setActiveTab(tabId)}
          onComplete={() => {
            setShowTutorial(false)
            setTutorialCompleted(true)
          }}
        />
      )}
    </div>
  )
}
