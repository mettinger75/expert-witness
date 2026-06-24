'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  Lock,
  FileSignature,
  CreditCard,
  Upload,
  PartyPopper,
  DollarSign,
  FileText,
  ClipboardList,
  Download,
  CalendarClock,
  Eye,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PortalContract } from './PortalContract'
import { PortalDocuments } from './PortalDocuments'
import { PortalInviteColleague } from './PortalInviteColleague'
import { PortalFeeSchedule, type FeeScheduleItem } from './PortalFeeSchedule'

type StepStatus = 'pending' | 'completed' | 'locked' | 'not_applicable'

interface OnboardingSteps {
  review_fee_schedule: StepStatus
  review_cv: StepStatus
  enter_case_details: StepStatus
  invite_colleague?: StepStatus
  schedule_call?: StepStatus
  sign_contract: StepStatus
  retainer_payment: StepStatus
  upload_documents: StepStatus
}

interface PortalOnboardingProps {
  token: string
  caseName: string
  contactName: string
  initialSteps: OnboardingSteps
  feeSchedule: FeeScheduleItem[]
  onComplete?: () => void
}

interface StepConfig {
  key: keyof OnboardingSteps
  label: string
  description: string
  icon: React.ReactNode
}

const STEP_CONFIGS: StepConfig[] = [
  {
    key: 'review_fee_schedule',
    label: 'Review Fee Schedule',
    description: 'Review Mark Ettinger, M.D.\'s fee schedule and rates',
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    key: 'review_cv',
    label: 'Review CV / Qualifications',
    description: 'Review Mark Ettinger, M.D.\'s curriculum vitae and qualifications',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: 'enter_case_details',
    label: 'Enter Case Details',
    description: 'Provide case information, patient details, and questions to be addressed',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    key: 'invite_colleague',
    label: 'Add Colleagues to the Case',
    description: 'Invite co-counsel, a paralegal, or others on your team to this portal',
    icon: <UserPlus className="h-5 w-5" />,
  },
  {
    key: 'schedule_call',
    label: 'Schedule Consultation',
    description: 'Book a consultation call with Dr. Ettinger to discuss your case',
    icon: <CalendarClock className="h-5 w-5" />,
  },
  {
    key: 'sign_contract',
    label: 'Review & Sign Agreement',
    description: 'Review and electronically sign the retention agreement',
    icon: <FileSignature className="h-5 w-5" />,
  },
  {
    key: 'retainer_payment',
    label: 'Retainer Payment',
    description: 'Submit retainer payment per the agreement terms',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    key: 'upload_documents',
    label: 'Upload Medical Records',
    description: 'Upload medical records and relevant case documents',
    icon: <Upload className="h-5 w-5" />,
  },
]

const CASE_TYPES = [
  { value: 'medical_malpractice', label: 'Medical Malpractice' },
  { value: 'personal_injury', label: 'Personal Injury' },
  { value: 'product_liability', label: 'Product Liability' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'peer_review', label: 'Peer Review' },
  { value: 'licensing_board', label: 'Licensing Board' },
  { value: 'other', label: 'Other' },
]

const CASE_SIDES = [
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'defense', label: 'Defense' },
  { value: 'neutral', label: 'Neutral' },
]

export function PortalOnboarding({
  token,
  caseName,
  contactName,
  initialSteps,
  feeSchedule,
  onComplete,
}: PortalOnboardingProps) {
  const [steps, setSteps] = useState<OnboardingSteps>(initialSteps)
  const [activeStep, setActiveStep] = useState<keyof OnboardingSteps | 'complete' | null>(null)

  // Determine the first actionable step
  useEffect(() => {
    if (activeStep) return
    for (const config of STEP_CONFIGS) {
      if (steps[config.key] === 'pending') {
        setActiveStep(config.key)
        return
      }
    }
    // All steps completed or not applicable
    const allDone = STEP_CONFIGS.every(
      (c) => steps[c.key] === 'completed' || steps[c.key] === 'not_applicable'
    )
    if (allDone) {
      setActiveStep('complete')
    }
  }, [steps, activeStep])

  const refreshSteps = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}/onboarding`)
      if (res.ok) {
        const data = await res.json()
        if (data.onboardingSteps) {
          setSteps(data.onboardingSteps as OnboardingSteps)
        }
      }
    } catch {
      // ignore
    }
  }, [token])

  async function updateStep(step: keyof OnboardingSteps, status: StepStatus) {
    try {
      const res = await fetch(`/api/portal/${token}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, status }),
      })
      if (res.ok) {
        const data = await res.json()
        setSteps(data.onboardingSteps as OnboardingSteps)
        setActiveStep(null) // trigger re-evaluation
      }
    } catch {
      // ignore
    }
  }

  function handleContractSigned() {
    refreshSteps()
    setActiveStep(null)
  }

  function getStepIcon(status: StepStatus, isActive: boolean) {
    if (status === 'completed') {
      return (
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
      )
    }
    if (status === 'locked') {
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <Lock className="h-5 w-5 text-gray-400" />
        </div>
      )
    }
    if (isActive) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#DFC06A]/20 border-2 border-[#DFC06A] flex items-center justify-center">
          <Circle className="h-5 w-5 text-[#DFC06A] fill-[#DFC06A]" />
        </div>
      )
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <Circle className="h-5 w-5 text-gray-300" />
      </div>
    )
  }

  // Filter out not_applicable and undefined (for backward compat with old invites missing new step keys)
  const applicableSteps = STEP_CONFIGS.filter((c) => {
    const status = steps[c.key]
    return status !== undefined && status !== 'not_applicable'
  })

  // Detect inquiry mode: schedule_call exists and is not not_applicable
  const isInquiryMode = steps.schedule_call !== undefined && steps.schedule_call !== 'not_applicable'
  const completedCount = applicableSteps.filter((c) => steps[c.key] === 'completed').length
  const totalSteps = applicableSteps.length
  const allComplete = completedCount === totalSteps && totalSteps > 0

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#0E1F35] mb-2">
          Welcome, {contactName}
        </h2>
        <p className="text-gray-600">
          {isInquiryMode
            ? 'Complete the following steps to explore a potential expert witness engagement.'
            : <>Complete the following steps to get started with{' '}<span className="font-medium">{caseName}</span></>}
        </p>
        {/* Progress bar */}
        <div className="mt-4 max-w-md mx-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{completedCount} of {totalSteps} steps completed</span>
            <span>{totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#DFC06A] rounded-full transition-all duration-500"
              style={{ width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* All complete celebration */}
      {allComplete && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center">
          <PartyPopper className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-emerald-800 mb-2">
            Onboarding Complete!
          </h3>
          <p className="text-emerald-600 mb-4">
            Thank you for completing all the onboarding steps. Mark Ettinger, M.D.&apos;s office
            will be in touch with you shortly.
          </p>
          <Button
            onClick={onComplete}
            className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
          >
            Explore Case Portal
          </Button>
        </div>
      )}

      {/* Stepper */}
      {!allComplete && (
        <div className="space-y-0">
          {applicableSteps.map((config, index) => {
            const status = steps[config.key] || 'locked' as StepStatus
            const isActive = activeStep === config.key
            const isLast = index === applicableSteps.length - 1

            return (
              <div key={config.key}>
                {/* Step row */}
                <div className="flex gap-4">
                  {/* Left: icon + connector line */}
                  <div className="flex flex-col items-center">
                    {getStepIcon(status, isActive)}
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 my-1 ${
                          status === 'completed' ? 'bg-emerald-300' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
                    <button
                      onClick={() => (status === 'pending' || status === 'completed') && setActiveStep(isActive ? null : config.key)}
                      disabled={status === 'locked'}
                      className={`text-left w-full ${
                        status === 'locked' ? 'opacity-50' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm ${status === 'locked' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {config.icon}
                        </span>
                        <h4
                          className={`font-semibold ${
                            isActive
                              ? 'text-[#0E1F35]'
                              : status === 'completed'
                                ? 'text-emerald-700'
                                : 'text-gray-500'
                          }`}
                        >
                          {config.label}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-500">{config.description}</p>
                    </button>

                    {/* Expanded step content */}
                    {isActive && (
                      <div className="mt-4 bg-white border rounded-lg p-6 shadow-sm">
                        {config.key === 'review_fee_schedule' && (
                          <FeeScheduleReviewStep
                            feeSchedule={feeSchedule}
                            requireAgreement={isInquiryMode}
                            onReviewed={() => updateStep('review_fee_schedule', 'completed')}
                          />
                        )}

                        {config.key === 'review_cv' && (
                          <CVReviewStep
                            onReviewed={() => updateStep('review_cv', 'completed')}
                          />
                        )}

                        {config.key === 'enter_case_details' && (
                          status === 'completed' ? (
                            <CaseDetailsSummary token={token} />
                          ) : (
                            <CaseDetailsStep
                              token={token}
                              onComplete={() => updateStep('enter_case_details', 'completed')}
                            />
                          )
                        )}

                        {config.key === 'invite_colleague' && (
                          <div className="space-y-4">
                            <PortalInviteColleague token={token} caseName={caseName} />
                            <div className="flex items-center justify-between">
                              <Button
                                variant="outline"
                                onClick={() => updateStep('invite_colleague', 'completed')}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                Skip — It&apos;s Just Me
                              </Button>
                              <Button
                                onClick={() => updateStep('invite_colleague', 'completed')}
                                className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
                              >
                                Continue
                              </Button>
                            </div>
                          </div>
                        )}

                        {config.key === 'schedule_call' && (
                          <ScheduleCallStep
                            onComplete={() => updateStep('schedule_call', 'completed')}
                          />
                        )}

                        {config.key === 'sign_contract' && (
                          status === 'completed' ? (
                            <div className="text-sm text-emerald-700 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Retention agreement has been signed.
                            </div>
                          ) : (
                            <PortalContract token={token} onSigned={handleContractSigned} />
                          )
                        )}

                        {config.key === 'retainer_payment' && (
                          <RetainerPaymentStep
                            onAcknowledge={() => updateStep('retainer_payment', 'completed')}
                          />
                        )}

                        {config.key === 'upload_documents' && (
                          <div className="space-y-4">
                            <PortalDocuments token={token} />
                            <div className="flex items-center justify-between">
                              <Button
                                variant="outline"
                                onClick={() => updateStep('upload_documents', 'completed')}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                Skip — No Documents Right Now
                              </Button>
                              <Button
                                onClick={() => updateStep('upload_documents', 'completed')}
                                className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
                              >
                                Done Uploading
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Step 1: Fee Schedule Review (with optional agreement for inquiry mode) */
function FeeScheduleReviewStep({
  feeSchedule,
  requireAgreement = false,
  onReviewed,
}: {
  feeSchedule: FeeScheduleItem[]
  requireAgreement?: boolean
  onReviewed: () => void
}) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Please review Mark Ettinger, M.D.&apos;s fee schedule below. These rates apply to all services
        rendered in connection with your case.
      </p>
      <PortalFeeSchedule feeSchedule={feeSchedule} />
      {requireAgreement && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#DFC06A] focus:ring-[#DFC06A]"
            />
            <span className="text-sm text-gray-700">
              I have reviewed and agree to the fee schedule and rates listed above for expert
              witness services provided by Mark Ettinger, M.D.
            </span>
          </label>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={onReviewed}
          disabled={requireAgreement && !agreed}
          className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {requireAgreement ? 'I Agree to the Fee Schedule' : "I've Reviewed the Fee Schedule"}
        </Button>
      </div>
    </div>
  )
}

/** Step 2: CV Review */
function CVReviewStep({ onReviewed }: { onReviewed: () => void }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-[#0E1F35]/5 border border-[#0E1F35]/10 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#DFC06A]/20 flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6 text-[#DFC06A]" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[#0E1F35] mb-1">
              Mark Ettinger, M.D. — Curriculum Vitae
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Board-certified anesthesiologist with extensive experience in expert witness consultation.
              Preview the CV here, or download a copy to review qualifications, publications, and prior
              expert witness experience.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview CV
              </Button>
              <a
                href="/ettinger-cv.pdf"
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-2 border border-[#0E1F35]/20 text-[#0E1F35] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#0E1F35] hover:text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                Download CV (PDF)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CV preview screen */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b text-left">
            <DialogTitle className="text-[#0E1F35] flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-[#DFC06A]" />
              Curriculum Vitae — Mark Ettinger, M.D.
            </DialogTitle>
          </DialogHeader>
          <iframe
            src="/ettinger-cv.pdf#view=FitH"
            title="Curriculum Vitae — Mark Ettinger, M.D."
            className="w-full h-[75vh] border-0 bg-gray-100"
          />
          <DialogFooter className="px-5 py-3 border-t flex-row items-center justify-between gap-2 sm:justify-between">
            <a
              href="/ettinger-cv.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#0E1F35]/70 underline underline-offset-2 hover:text-[#0E1F35]"
            >
              Open in new tab
            </a>
            <a href="/ettinger-cv.pdf" download>
              <Button className="bg-[#0E1F35] hover:bg-[#0E1F35]/90">
                <Download className="h-4 w-4 mr-2" />
                Download CV
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end">
        <Button
          onClick={onReviewed}
          className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          I&apos;ve Reviewed the CV
        </Button>
      </div>
    </div>
  )
}

/** Step 3: Case Details Entry */
function CaseDetailsStep({
  token,
  onComplete,
}: {
  token: string
  onComplete: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    case_name: '',
    case_type: '',
    side: '',
    date_of_incident: '',
    jurisdiction_state: '',
    patient_name: '',
    patient_dob: '',
    brief_summary: '',
    key_issues: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.case_name.trim()) {
      setError('Please enter a case name')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/case-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_name: form.case_name || undefined,
          case_type: form.case_type || undefined,
          side: form.side || undefined,
          date_of_incident: form.date_of_incident || undefined,
          jurisdiction_state: form.jurisdiction_state || undefined,
          patient_name: form.patient_name || undefined,
          patient_dob: form.patient_dob || undefined,
          brief_summary: form.brief_summary || undefined,
          key_issues: form.key_issues || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save case details')
        return
      }
      onComplete()
    } catch {
      setError('Failed to save case details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-gray-600">
        Please provide the following information about your case. Fields marked with * are required.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Case Name */}
      <div className="space-y-1.5">
        <Label htmlFor="case_name">Case Name *</Label>
        <Input
          id="case_name"
          placeholder="e.g., Smith v. General Hospital"
          value={form.case_name}
          onChange={(e) => updateField('case_name', e.target.value)}
          required
        />
      </div>

      {/* Case Type & Side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Case Type</Label>
          <Select value={form.case_type} onValueChange={(v) => updateField('case_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {CASE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Your Side</Label>
          <Select value={form.side} onValueChange={(v) => updateField('side', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select side..." />
            </SelectTrigger>
            <SelectContent>
              {CASE_SIDES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date of Incident & Jurisdiction */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date_of_incident">Date of Incident</Label>
          <Input
            id="date_of_incident"
            type="date"
            value={form.date_of_incident}
            onChange={(e) => updateField('date_of_incident', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jurisdiction_state">Jurisdiction (State)</Label>
          <Input
            id="jurisdiction_state"
            placeholder="e.g., California"
            value={form.jurisdiction_state}
            onChange={(e) => updateField('jurisdiction_state', e.target.value)}
          />
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="patient_name">Patient Name</Label>
          <Input
            id="patient_name"
            placeholder="Patient's full name"
            value={form.patient_name}
            onChange={(e) => updateField('patient_name', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="patient_dob">Patient Date of Birth</Label>
          <Input
            id="patient_dob"
            type="date"
            value={form.patient_dob}
            onChange={(e) => updateField('patient_dob', e.target.value)}
          />
        </div>
      </div>

      {/* Brief Summary */}
      <div className="space-y-1.5">
        <Label htmlFor="brief_summary">Brief Case Summary</Label>
        <Textarea
          id="brief_summary"
          placeholder="Provide a brief summary of the case, including key facts and allegations..."
          rows={4}
          value={form.brief_summary}
          onChange={(e) => updateField('brief_summary', e.target.value)}
        />
      </div>

      {/* Key Issues / Questions */}
      <div className="space-y-1.5">
        <Label htmlFor="key_issues">Questions to Be Addressed</Label>
        <Textarea
          id="key_issues"
          placeholder="What specific questions would you like Dr. Ettinger to address? (e.g., standard of care, causation, damages...)"
          rows={3}
          value={form.key_issues}
          onChange={(e) => updateField('key_issues', e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
        >
          {saving ? 'Saving...' : 'Save Case Details & Continue'}
        </Button>
      </div>
    </form>
  )
}

/** Schedule Call Step — embeds Morgen booking iframe */
function ScheduleCallStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Schedule a consultation call with Dr. Ettinger to discuss your case and determine
        whether his expertise is a good fit.
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <iframe
          src="https://book.morgen.so/markettingermd/expertcall"
          className="w-full border-0"
          style={{ height: '600px' }}
          title="Schedule Consultation Call"
          allow="payment"
        />
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onComplete}
          className="text-gray-500 hover:text-gray-700"
        >
          Skip &mdash; I&apos;ll Schedule Later
        </Button>
        <Button
          onClick={onComplete}
          className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
        >
          I&apos;ve Scheduled My Call
        </Button>
      </div>
    </div>
  )
}

/** Step 5: Retainer Payment — shows payment instructions, attorney acknowledges */
function RetainerPaymentStep({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Payment Instructions
        </h4>
        <div className="text-sm text-amber-700 space-y-2">
          <p>
            Please submit the retainer payment as specified in the retention agreement.
            Accepted payment methods:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Check:</strong> Made payable to Mark Ettinger, M.D. Mail to the address listed in the agreement.</li>
            <li><strong>Wire Transfer:</strong> Contact our office for wire transfer instructions.</li>
          </ul>
          <p className="mt-3 text-amber-600 italic">
            Mark Ettinger, M.D.&apos;s office will confirm receipt of payment and update your portal status.
          </p>
        </div>
      </div>

      <Button
        onClick={onAcknowledge}
        className="w-full bg-[#0E1F35] hover:bg-[#0E1F35]/90"
      >
        I Understand — Payment Will Be Sent
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Case Details Summary (read-only, for pre-filled cases)
// ---------------------------------------------------------------------------
function CaseDetailsSummary({ token }: { token: string }) {
  const [caseData, setCaseData] = useState<Record<string, string | null> | null>(null)

  useEffect(() => {
    fetch(`/api/portal/${token}/case-details`)
      .then(r => r.json())
      .then(data => setCaseData(data))
      .catch(() => {})
  }, [token])

  if (!caseData) return <div className="text-sm text-muted-foreground">Loading case details...</div>

  const fields = [
    { label: 'Case Name', value: caseData.case_name },
    { label: 'Case Type', value: caseData.case_type?.replace(/_/g, ' ') },
    { label: 'Side', value: caseData.side },
    { label: 'Patient', value: caseData.patient_name },
    { label: 'State', value: caseData.jurisdiction_state },
  ].filter(f => f.value)

  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <p className="text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Case details have been entered. Here&apos;s a summary:
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.label}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</p>
            <p className="text-sm capitalize mt-0.5" style={{ color: '#0E1F35' }}>{f.value}</p>
          </div>
        ))}
      </div>
      {caseData.brief_summary && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</p>
          <p className="text-sm mt-0.5 text-gray-600">{caseData.brief_summary}</p>
        </div>
      )}
    </div>
  )
}

