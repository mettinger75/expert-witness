'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackPortalEvent } from '@/lib/portal-track'
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
  FolderArchive,
  Bookmark,
  Copy,
  Check,
  Mail,
  Smartphone,
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
import { PortalExpertFiles } from './PortalExpertFiles'
import { PortalWelcomeCover } from './PortalWelcomeCover'
import { PortalInviteColleague } from './PortalInviteColleague'

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
  can_invite_contacts: boolean
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
  // First-visit experience: show the cinematic cover first, then (on enter) the
  // save-your-link prompt. Gating both on view_count === 1 previously stacked
  // the two dialogs on top of each other — now they run in sequence.
  const [showCover, setShowCover] = useState(invite.view_count === 1)
  const [showSaveLink, setShowSaveLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
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
    {
      id: 'expert-files',
      label: 'Expert Files',
      icon: <FolderArchive className="h-4 w-4" />,
      enabled: true,
    },
  ]

  const enabledTabs = tabs.filter((t) => t.enabled)
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const initialTab =
    requestedTab && enabledTabs.some((t) => t.id === requestedTab)
      ? requestedTab
      : enabledTabs[0]?.id || 'summary'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Called when the visitor dismisses the welcome cover: hand off to the
  // save-your-link prompt, route them to the most important tab, then launch
  // the spotlight tutorial.
  const enterFromCover = useCallback(() => {
    setShowCover(false)
    setShowSaveLink(true)
    if (!invite.onboarding_mode) {
      if (invite.can_sign_contract && invite.contract_id && !contractSigned) {
        setActiveTab('contract')
      } else if (invite.can_upload_documents) {
        setActiveTab('documents')
      }
    }
  }, [
    invite.onboarding_mode,
    invite.can_sign_contract,
    invite.contract_id,
    invite.can_upload_documents,
    contractSigned,
  ])

  // The save-your-link prompt is the last step of the first-visit sequence:
  // cover → bookmark → (on close) spotlight tutorial. Only launch the tutorial
  // on the genuine first visit and outside onboarding mode (onboarding launches
  // its own tutorial after the stepper completes). launchTutorial no-ops if the
  // tutorial was already completed.
  const handleSaveLinkOpenChange = useCallback(
    (open: boolean) => {
      setShowSaveLink(open)
      if (!open && !invite.onboarding_mode && invite.view_count === 1) {
        launchTutorial()
      }
    },
    [launchTutorial, invite.onboarding_mode, invite.view_count]
  )

  // Fire a page_view event on the initial load, and feature_opened when the
  // recipient switches tabs. trackPortalEvent no-ops under ?preview=1.
  useEffect(() => {
    trackPortalEvent(invite.token, 'page_view', { view: 'portal_root' })
  }, [invite.token])
  useEffect(() => {
    if (!activeTab) return
    const label = enabledTabs.find((t) => t.id === activeTab)?.label || activeTab
    trackPortalEvent(invite.token, 'feature_opened', { tab: activeTab, label })
  }, [activeTab, enabledTabs, invite.token])

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
        {/* Onboarding has its own intake-focused introduction screen (rendered
            inside PortalOnboarding), so the generic feature cover is suppressed
            here to avoid a double welcome. The save-your-link prompt is handed
            off from the intro's "Get Started" via onBegin below. */}
        <SaveLinkDialog
          open={showSaveLink}
          onOpenChange={handleSaveLinkOpenChange}
          token={token}
          contactEmail={invite.contact?.email || null}
          linkCopied={linkCopied}
          setLinkCopied={setLinkCopied}
        />
        {/* Case header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-[#0E1F35] text-white px-4 py-1.5 rounded-full text-sm mb-3">
            <span className="text-[#DFC06A] font-medium">Case Portal</span>
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
          onBegin={() => setShowSaveLink(true)}
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
      {showCover && (
        <PortalWelcomeCover
          contactName={contactName}
          caseName={caseData.case_name}
          caseNumber={caseData.case_number}
          isInquiry={caseData.status === 'inquiry'}
          invite={invite}
          onEnter={enterFromCover}
        />
      )}
      <SaveLinkDialog
        open={showSaveLink}
        onOpenChange={handleSaveLinkOpenChange}
        token={token}
        contactEmail={invite.contact?.email || null}
        linkCopied={linkCopied}
        setLinkCopied={setLinkCopied}
      />

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSaveLink(true)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-[#DFC06A] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-sm font-medium"
            title="Save your portal link"
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Save link</span>
          </button>
          <button
            onClick={() => setShowTutorial(true)}
            className="text-gray-400 hover:text-[#DFC06A] transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            title="Portal tutorial"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tab navigation - Meridian style */}
      <div className="border-b border-gray-200 mb-6">
        <nav
          className="flex gap-1 -mb-px overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Portal tabs"
          data-tour="portal-tabs"
        >
          {enabledTabs.map((tab) => (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-[#DFC06A] text-[#0E1F35]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="ml-1 bg-[#DFC06A] text-[#0E1F35] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              {tab.id === 'contract' && !contractSigned && (
                <span className="ml-1 w-2 h-2 rounded-full bg-[#DFC06A]" />
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
          <div className="space-y-6">
            <PortalSummary caseData={caseData} caseContacts={caseContacts} />
            {invite.can_invite_contacts && (
              <PortalInviteColleague token={token} caseName={caseData.case_name} />
            )}
          </div>
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
        {activeTab === 'expert-files' && <PortalExpertFiles />}
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

// ---------------------------------------------------------------------------
// SaveLinkDialog — shown on first visit, prompts the user to bookmark/save
// their personal portal link. This link is how they'll access the portal for
// all future communications; no account or password needed.
// ---------------------------------------------------------------------------
function SaveLinkDialog({
  open,
  onOpenChange,
  token,
  contactEmail,
  linkCopied,
  setLinkCopied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  contactEmail: string | null
  linkCopied: boolean
  setLinkCopied: (v: boolean) => void
}) {
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const portalUrl =
    typeof window !== 'undefined'
      ? window.location.origin + `/portal/${token}`
      : `/portal/${token}`

  const isApple =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/.test(navigator.userAgent)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(portalUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {
      // ignore
    }
  }

  async function emailMeLink() {
    if (!contactEmail || emailState !== 'idle') return
    setEmailState('sending')
    try {
      const res = await fetch(`/api/portal/${token}/email-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      setEmailState(res.ok ? 'sent' : 'idle')
    } catch {
      setEmailState('idle')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-[#DFC06A]" />
            Save Your Portal Link
          </DialogTitle>
          <DialogDescription>
            This link is your personal access to the case portal. Please bookmark
            it or save it somewhere safe — you&apos;ll use it for all future
            communications. No account or password needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-mono break-all text-[#0E1F35]">
            {portalUrl}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button onClick={copyLink} variant="outline" className="w-full">
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy link
                </>
              )}
            </Button>

            {contactEmail && (
              <Button
                onClick={emailMeLink}
                variant="outline"
                className="w-full"
                disabled={emailState !== 'idle'}
              >
                {emailState === 'sent' ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-emerald-600" />
                    Sent!
                  </>
                ) : emailState === 'sending' ? (
                  <>
                    <Mail className="h-4 w-4 mr-2 animate-pulse" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Email me this link
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="rounded-lg bg-[#0E1F35]/[0.03] border border-gray-200 p-3 space-y-1.5">
            <p className="flex items-center gap-2 text-xs text-gray-600">
              <Bookmark className="h-3.5 w-3.5 text-[#DFC06A] shrink-0" />
              Bookmark this page now —{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-mono text-[11px] text-gray-700">
                {isApple ? '⌘' : 'Ctrl'} + D
              </kbd>
            </p>
            {isMobile && (
              <p className="flex items-center gap-2 text-xs text-gray-600">
                <Smartphone className="h-3.5 w-3.5 text-[#DFC06A] shrink-0" />
                On mobile: tap{' '}
                <span className="font-medium">Share → Add to Home Screen</span>.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 w-full"
          >
            Got it — Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
