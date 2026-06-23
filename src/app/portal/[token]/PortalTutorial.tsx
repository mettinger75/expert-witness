'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import {
  FileText,
  Upload,
  MessageSquare,
  ClipboardList,
  DollarSign,
  Pencil,
  FileSignature,
  Gavel,
  Clock,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center'

interface PortalTutorialStep {
  id: string
  targetSelector: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  tooltipPosition: TooltipPosition
  features?: string[]
  spotlightPadding?: number
  switchToTab?: string
  requiredTab?: string
}

interface PortalTutorialProps {
  token: string
  enabledTabs: string[]
  onSwitchTab: (tabId: string) => void
  onComplete: () => void
}

// ─── Tutorial Steps ─────────────────────────────────────────────────────────

const ALL_TUTORIAL_STEPS: PortalTutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-tour="portal-tabs"]',
    title: 'Welcome to Your Case Portal',
    description:
      'This is your secure portal for managing case information. Use these tabs to navigate between different sections. Let us walk you through the key features.',
    icon: ClipboardList,
    tooltipPosition: 'bottom',
    features: [
      'Each tab provides a different view of your case',
      'Tabs with gold dots indicate items needing attention',
      'You can return to any section at any time',
    ],
    spotlightPadding: 12,
  },
  {
    id: 'documents-tab',
    targetSelector: '[data-tour="tab-documents"]',
    title: 'Documents',
    description:
      'Click the Documents tab to upload medical records, billing records, and other case materials.',
    icon: Upload,
    tooltipPosition: 'bottom',
    switchToTab: 'documents',
    requiredTab: 'documents',
  },
  {
    id: 'documents-upload',
    targetSelector: '[data-tour="documents-upload-area"]',
    title: 'Upload Documents',
    description:
      'Drag and drop files here or click to browse. You can upload medical records, deposition transcripts, billing records, and more.',
    icon: Upload,
    tooltipPosition: 'bottom',
    features: [
      'Select a document category for each upload',
      'Add an optional description for context',
      'Supports PDF, DOC, XLS, images, and more (up to 200MB)',
    ],
    switchToTab: 'documents',
    requiredTab: 'documents',
    spotlightPadding: 12,
  },
  {
    id: 'documents-list',
    targetSelector: '[data-tour="documents-list"]',
    title: 'Case Documents',
    description:
      "All documents shared for this case appear here, including those uploaded by you and by Dr. Ettinger's office.",
    icon: FileText,
    tooltipPosition: 'top',
    switchToTab: 'documents',
    requiredTab: 'documents',
  },
  {
    id: 'reports-tab',
    targetSelector: '[data-tour="tab-reports"]',
    title: 'Expert Reports',
    description:
      'The Reports tab shows all expert reports generated for your case. Reports awaiting your review will have a gold "Awaiting Your Review" badge.',
    icon: FileText,
    tooltipPosition: 'bottom',
    switchToTab: 'reports',
    requiredTab: 'reports',
  },
  {
    id: 'reports-list',
    targetSelector: '[data-tour="reports-list"]',
    title: 'Report List',
    description:
      'Click any report to view its contents. Reports in "Awaiting Your Review" status can be edited and returned with your revisions.',
    icon: FileText,
    tooltipPosition: 'bottom',
    features: [
      'Click "View" to read the full report',
      'Reports sent for your review have a gold border',
      'Status badges show where each report is in the workflow',
    ],
    switchToTab: 'reports',
    requiredTab: 'reports',
  },
  {
    id: 'report-editing',
    targetSelector: '',
    title: 'Editing & Redlining Reports',
    description:
      "When a report is sent for your review, you can edit it directly and submit your changes. Dr. Ettinger will review your edits in a redline view showing exactly what was added or removed.",
    icon: Pencil,
    tooltipPosition: 'center',
    features: [
      'Click "Edit" to open the rich text editor',
      'Make your changes and add notes for Dr. Ettinger',
      'Click "Redline" to see the diff of all revision rounds',
      'You can accept the report as-is if no changes are needed',
    ],
    requiredTab: 'reports',
  },
  {
    id: 'messages-tab',
    targetSelector: '[data-tour="tab-messages"]',
    title: 'Secure Messages',
    description:
      "Use the Messages tab to communicate securely with Dr. Ettinger's office. All messages are encrypted and tied to your case.",
    icon: MessageSquare,
    tooltipPosition: 'bottom',
    switchToTab: 'messages',
    requiredTab: 'messages',
    features: [
      'Send and receive messages in real time',
      'Unread messages show a gold notification badge',
      'All communication is logged to your case file',
    ],
  },
  {
    id: 'contract-tab',
    targetSelector: '[data-tour="tab-contract"]',
    title: 'Retention Agreement',
    description:
      'Review and electronically sign the retention agreement. A gold dot indicates the contract is awaiting your signature.',
    icon: FileSignature,
    tooltipPosition: 'bottom',
    switchToTab: 'contract',
    requiredTab: 'contract',
  },
  {
    id: 'fee-schedule-tab',
    targetSelector: '[data-tour="tab-fee-schedule"]',
    title: 'Fee Schedule',
    description:
      "View Dr. Ettinger's fee schedule, including hourly rates for record review, deposition testimony, trial testimony, and other services.",
    icon: DollarSign,
    tooltipPosition: 'bottom',
    switchToTab: 'fee-schedule',
    requiredTab: 'fee-schedule',
  },
  {
    id: 'timeline-tab',
    targetSelector: '[data-tour="tab-timeline"]',
    title: 'Communication Timeline',
    description:
      'The Timeline tab shows a chronological log of all communications and events related to your case.',
    icon: Clock,
    tooltipPosition: 'bottom',
    switchToTab: 'timeline',
    requiredTab: 'timeline',
  },
  {
    id: 'depositions-tab',
    targetSelector: '[data-tour="tab-depositions"]',
    title: 'Depositions',
    description:
      'Access deposition details, including summaries, key admissions, and scheduling information.',
    icon: Gavel,
    tooltipPosition: 'bottom',
    switchToTab: 'depositions',
    requiredTab: 'depositions',
  },
  {
    id: 'complete',
    targetSelector: '',
    title: "You're All Set!",
    description:
      'You now know how to navigate your case portal. If you need to see this tutorial again, click the help button in the header.',
    icon: ClipboardList,
    tooltipPosition: 'center',
    features: [
      'Upload documents when you have records to share',
      'Check back regularly for new reports and messages',
      'Use the Messages tab if you have questions',
    ],
  },
]

// ─── Hook: Track Element Position ───────────────────────────────────────────

function useElementRect(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }

    let retryCount = 0
    let retryTimer: ReturnType<typeof setTimeout>

    const update = () => {
      const el = document.querySelector(selector)
      if (el) {
        setRect(el.getBoundingClientRect())
        return true
      }
      return false
    }

    const tryFind = () => {
      if (!update() && retryCount < 20) {
        retryCount++
        retryTimer = setTimeout(tryFind, 100)
      }
    }

    tryFind()

    const el = document.querySelector(selector)
    if (!el) return

    const observer = new ResizeObserver(() => update())
    observer.observe(el)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    return () => {
      clearTimeout(retryTimer)
      observer.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [selector])

  return rect
}

// ─── Helper: Calculate Tooltip Position ─────────────────────────────────────

function calcTooltipStyle(
  targetRect: DOMRect | null,
  position: TooltipPosition,
  tooltipWidth: number,
  tooltipHeight: number,
  padding: number
): React.CSSProperties {
  if (!targetRect || position === 'center') {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const gap = 16
  let top = 0
  let left = 0

  switch (position) {
    case 'bottom':
      top = targetRect.bottom + padding + gap
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      break
    case 'top':
      top = targetRect.top - padding - gap - tooltipHeight
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      break
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.right + padding + gap
      break
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.left - padding - gap - tooltipWidth
      break
  }

  const vPad = 16
  top = Math.max(vPad, Math.min(top, window.innerHeight - tooltipHeight - vPad))
  left = Math.max(vPad, Math.min(left, window.innerWidth - tooltipWidth - vPad))

  return { position: 'fixed', top, left }
}

// ─── Helper: Arrow Styles ───────────────────────────────────────────────────

function getArrowStyle(position: TooltipPosition): React.CSSProperties | null {
  const size = 10
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  }

  switch (position) {
    case 'bottom':
      return {
        ...base,
        top: -size,
        left: '50%',
        marginLeft: -size,
        borderWidth: `0 ${size}px ${size}px ${size}px`,
        borderColor: 'transparent transparent #0E1F35 transparent',
      }
    case 'top':
      return {
        ...base,
        bottom: -size,
        left: '50%',
        marginLeft: -size,
        borderWidth: `${size}px ${size}px 0 ${size}px`,
        borderColor: '#0E1F35 transparent transparent transparent',
      }
    case 'right':
      return {
        ...base,
        top: '50%',
        left: -size,
        marginTop: -size,
        borderWidth: `${size}px ${size}px ${size}px 0`,
        borderColor: 'transparent #0E1F35 transparent transparent',
      }
    case 'left':
      return {
        ...base,
        top: '50%',
        right: -size,
        marginTop: -size,
        borderWidth: `${size}px 0 ${size}px ${size}px`,
        borderColor: 'transparent transparent transparent #0E1F35',
      }
    default:
      return null
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PortalTutorial({
  token,
  enabledTabs,
  onSwitchTab,
  onComplete,
}: PortalTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [waitingForTab, setWaitingForTab] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const titleId = 'portal-tutorial-title'
  const [tooltipSize, setTooltipSize] = useState({ width: 420, height: 400 })
  const [reduceMotion, setReduceMotion] = useState(false)

  // Filter steps based on enabled tabs
  const steps = useMemo(() => {
    return ALL_TUTORIAL_STEPS.filter((step) => {
      if (!step.requiredTab) return true
      return enabledTabs.includes(step.requiredTab)
    })
  }, [enabledTabs])

  const step = steps[currentStep]
  const padding = step?.spotlightPadding ?? 8
  const targetSelector = !waitingForTab && step?.targetSelector ? step.targetSelector : null
  const targetRect = useElementRect(targetSelector)

  // On mount, remember who had focus so we can restore it when the tutorial
  // closes (focus management for screen-reader / keyboard users).
  useEffect(() => {
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null
    setMounted(true)
    return () => {
      previouslyFocusedRef.current?.focus?.()
    }
  }, [])

  // Honor prefers-reduced-motion for the spotlight transition and spinner.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Lock body scroll while tutorial is active
  useEffect(() => {
    if (waitingForTab) {
      document.body.style.overflow = ''
    } else {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [waitingForTab])

  // Switch to the correct tab when a step requires it
  useEffect(() => {
    const tabId = step?.switchToTab
    if (!tabId) {
      setWaitingForTab(false)
      return
    }

    setWaitingForTab(true)
    onSwitchTab(tabId)

    // Wait for the tab content to render
    const timer = setTimeout(() => {
      setWaitingForTab(false)
    }, 350)

    return () => clearTimeout(timer)
  }, [currentStep, step?.switchToTab, onSwitchTab])

  // Scroll target into view
  useEffect(() => {
    if (waitingForTab || !targetSelector) return
    const el = document.querySelector(targetSelector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep, targetSelector, waitingForTab])

  // Measure tooltip after render
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      setTooltipSize({ width: rect.width, height: rect.height })
    }
  }, [currentStep])

  const handleComplete = useCallback(async () => {
    document.body.style.overflow = ''

    // Persist tutorial completion
    try {
      await fetch(`/api/portal/${token}/tutorial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
    } catch {
      // Silently fail — tutorial is still dismissed locally
    }

    onComplete?.()
  }, [token, onComplete])

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }, [currentStep, steps.length, handleComplete])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  // Keyboard support: Escape closes (complete/skip), ArrowRight = Next,
  // ArrowLeft = Back (only when a previous step exists).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleComplete()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          e.preventDefault()
          handlePrev()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleComplete, handleNext, handlePrev, currentStep])

  // Move focus to the primary action button when the tutorial opens and on each
  // step change, so keyboard users land inside the dialog.
  useEffect(() => {
    if (mounted && !waitingForTab) {
      nextButtonRef.current?.focus()
    }
  }, [mounted, waitingForTab, currentStep])

  if (!mounted || !step) return null

  // Show loading overlay while switching tabs
  if (waitingForTab) {
    const loadingOverlay = (
      <>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(14, 31, 53, 0.72)',
            zIndex: 9998,
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 text-center">
            <div className="w-8 h-8 border-2 border-[#DFC06A] border-t-transparent rounded-full motion-safe:animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-[#0E1F35]">
              Navigating to {step.title}...
            </p>
          </div>
        </div>
      </>
    )
    return createPortal(loadingOverlay, document.body)
  }

  const Icon = step.icon
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0
  const isCentered = step.tooltipPosition === 'center' || !targetRect

  const tooltipStyle = calcTooltipStyle(
    targetRect,
    step.tooltipPosition,
    tooltipSize.width,
    tooltipSize.height,
    padding
  )

  const arrowStyle = !isCentered ? getArrowStyle(step.tooltipPosition) : null

  const tooltipWidth =
    typeof window !== 'undefined' && window.innerWidth < 500
      ? Math.min(360, window.innerWidth - 32)
      : 420

  const overlay = (
    <>
      {/* Spotlight cutout */}
      {targetRect && !isCentered ? (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(14, 31, 53, 0.72)',
            zIndex: 9998,
            pointerEvents: 'none',
            transition: reduceMotion
              ? 'none'
              : 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(14, 31, 53, 0.72)',
            zIndex: 9998,
          }}
        />
      )}

      {/* Click blocker */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'auto',
          cursor: 'default',
        }}
      />

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          ...tooltipStyle,
          width: tooltipWidth,
          zIndex: 9999,
        }}
        className="motion-safe:[animation:portalTutorialFadeIn_0.3s_ease]"
      >
        {arrowStyle && <div style={arrowStyle} />}

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ backgroundColor: '#0E1F35' }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(201,168,76,0.2)' }}
              >
                <Icon className="w-4 h-4" style={{ color: '#DFC06A' }} />
              </div>
              <div>
                <p
                  className="text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  Step {currentStep + 1} of {steps.length}
                </p>
                <h3
                  id={titleId}
                  className="text-white font-semibold text-sm"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {step.title}
                </h3>
              </div>
            </div>
            <button
              onClick={handleComplete}
              className="text-white/40 hover:text-white transition-colors p-1"
              title="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Gold progress bar */}
          <div
            style={{
              height: 3,
              background: `linear-gradient(90deg, #DFC06A ${((currentStep + 1) / steps.length) * 100}%, rgba(201,168,76,0.12) ${((currentStep + 1) / steps.length) * 100}%)`,
            }}
          />

          {/* Content */}
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>
              {step.description}
            </p>

            {step.features && step.features.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {step.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start text-[13px]"
                    style={{ color: '#374151' }}
                  >
                    <span
                      className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: 'rgba(201,168,76,0.12)',
                        color: '#DFC06A',
                      }}
                    >
                      {idx + 1}
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            {/* Step dots */}
            <div className="flex items-center justify-center space-x-1.5 mt-4 mb-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: idx === currentStep ? 16 : 6,
                    height: 6,
                    backgroundColor:
                      idx === currentStep
                        ? '#DFC06A'
                        : idx < currentStep
                          ? 'rgba(201,168,76,0.4)'
                          : '#E5E7EB',
                    borderRadius: 3,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-4 flex items-center justify-between">
            <button
              onClick={handleComplete}
              className="text-xs hover:underline"
              style={{ color: '#9CA3AF' }}
            >
              Skip tour
            </button>
            <div className="flex items-center space-x-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-neutral-50"
                  style={{ borderColor: '#E5E7EB', color: '#0E1F35' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                  Back
                </button>
              )}
              <button
                ref={nextButtonRef}
                onClick={handleNext}
                className="flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors hover:opacity-90"
                style={{
                  backgroundColor: isLastStep ? '#10B981' : '#0E1F35',
                }}
              >
                {isLastStep ? 'Complete' : 'Next'}
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes portalTutorialFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )

  return createPortal(overlay, document.body)
}
