'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileSignature,
  MessageSquare,
  Upload,
  FileText,
  ClipboardList,
  Receipt,
  Gavel,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

interface CoverPermissions {
  can_sign_contract: boolean
  contract_id: string | null
  can_message: boolean
  can_upload_documents: boolean
  can_view_reports: boolean
  can_view_summary: boolean
  can_view_billing: boolean
  can_view_depositions: boolean
  can_book_scheduling: boolean
}

interface PortalWelcomeCoverProps {
  contactName: string
  caseName: string
  caseNumber: string
  isInquiry: boolean
  invite: CoverPermissions
  onEnter: () => void
}

interface Feature {
  icon: React.ReactNode
  title: string
  subtitle: string
}

const NAVY = '#0E1F35'
const NAVY_DEEP = '#091525'
const GOLD = '#DFC06A'

function buildFeatures(invite: CoverPermissions): Feature[] {
  const all: Array<Feature & { enabled: boolean }> = [
    {
      enabled: invite.can_sign_contract && !!invite.contract_id,
      icon: <FileSignature className="h-5 w-5" />,
      title: 'Review & sign',
      subtitle: 'Your retention agreement',
    },
    {
      enabled: invite.can_message,
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Message securely',
      subtitle: 'A direct line to Dr. Ettinger',
    },
    {
      enabled: invite.can_upload_documents,
      icon: <Upload className="h-5 w-5" />,
      title: 'Share records',
      subtitle: 'Upload documents safely',
    },
    {
      enabled: invite.can_view_reports,
      icon: <FileText className="h-5 w-5" />,
      title: 'Expert reports',
      subtitle: 'Read the latest versions',
    },
    {
      enabled: invite.can_view_summary,
      icon: <ClipboardList className="h-5 w-5" />,
      title: 'Case overview',
      subtitle: 'Status, timeline & key issues',
    },
    {
      enabled: invite.can_view_depositions,
      icon: <Gavel className="h-5 w-5" />,
      title: 'Depositions',
      subtitle: 'Transcripts & summaries',
    },
    {
      enabled: invite.can_view_billing,
      icon: <Receipt className="h-5 w-5" />,
      title: 'Billing',
      subtitle: 'Invoices & payments',
    },
    {
      enabled: invite.can_book_scheduling,
      icon: <CalendarClock className="h-5 w-5" />,
      title: 'Scheduling',
      subtitle: 'Book calls & depositions',
    },
  ]
  return all.filter((f) => f.enabled).slice(0, 4)
}

/**
 * Lightweight gold "constellation" field drawn on a canvas behind the welcome
 * content. Particles drift and link to nearby neighbours. Honors
 * prefers-reduced-motion by drawing a single static frame.
 */
function useConstellation(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let width = 0
    let height = 0
    let dpr = 1
    type P = { x: number; y: number; vx: number; vy: number }
    let particles: P[] = []

    function seed() {
      const area = width * height
      const count = Math.min(64, Math.max(24, Math.round(area / 22000)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }))
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas!.clientWidth
      height = canvas!.clientHeight
      canvas!.width = Math.floor(width * dpr)
      canvas!.height = Math.floor(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const dist = Math.hypot(dx, dy)
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.18
            ctx!.strokeStyle = `rgba(223,192,106,${alpha})`
            ctx!.lineWidth = 0.6
            ctx!.beginPath()
            ctx!.moveTo(p.x, p.y)
            ctx!.lineTo(q.x, q.y)
            ctx!.stroke()
          }
        }
      }
      for (const p of particles) {
        ctx!.fillStyle = 'rgba(223,192,106,0.55)'
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function tick() {
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      }
      draw()
      raf = requestAnimationFrame(tick)
    }

    resize()
    if (reduceMotion) {
      draw()
    } else {
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef])
}

export function PortalWelcomeCover({
  contactName,
  caseName,
  caseNumber,
  isInquiry,
  invite,
  onEnter,
}: PortalWelcomeCoverProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [leaving, setLeaving] = useState(false)
  useConstellation(canvasRef)

  const firstName = contactName?.trim().split(/\s+/)[0]
  const greeting =
    firstName && firstName.toLowerCase() !== 'attorney'
      ? `Welcome, ${firstName}.`
      : 'Welcome to your case portal.'

  const features = buildFeatures(invite)
  const ctaLabel =
    invite.can_sign_contract && invite.contract_id
      ? 'Review & sign agreement'
      : 'Enter your portal'

  const handleEnter = useCallback(() => {
    setLeaving(true)
    window.setTimeout(onEnter, 430)
  }, [onEnter])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === 'Escape') handleEnter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleEnter])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to your case portal"
      className={`pwc-root fixed inset-0 z-[60] overflow-y-auto ${leaving ? 'pwc-leaving' : ''}`}
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, #14233b 0%, ${NAVY} 45%, ${NAVY_DEEP} 100%)`,
      }}
    >
      <style>{coverStyles}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        {/* Case pill */}
        <div
          className="pwc-rise mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm"
          style={{ animationDelay: '60ms' }}
        >
          <span className="font-medium" style={{ color: GOLD }}>
            Case Portal
          </span>
          <span className="text-white/30">|</span>
          <span className="font-mono text-xs tracking-wide text-white/80">
            {caseNumber}
          </span>
        </div>

        {/* Monogram */}
        <div
          className="pwc-rise relative mb-7 flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold"
          style={{ animationDelay: '120ms', background: GOLD, color: NAVY }}
        >
          <span className="pwc-ring absolute inset-0 rounded-full" aria-hidden="true" />
          ME
        </div>

        {/* Greeting */}
        <h1
          className="pwc-rise text-3xl font-bold tracking-tight text-white sm:text-4xl"
          style={{ animationDelay: '180ms' }}
        >
          {greeting}
        </h1>

        <p
          className="pwc-rise mt-3 max-w-xl text-base leading-relaxed text-white/70"
          style={{ animationDelay: '240ms' }}
        >
          {isInquiry ? (
            <>
              This secure portal is your home for an expert-witness consultation
              with{' '}
              <span className="font-medium text-white">Mark Ettinger, M.D.</span>{' '}
              — review his qualifications, share case details, and get started.
            </>
          ) : (
            <>
              This secure portal is your home for everything on{' '}
              <span className="font-medium text-white">{caseName}</span> with
              your expert,{' '}
              <span className="font-medium text-white">Mark Ettinger, M.D.</span>
            </>
          )}
        </p>

        {/* Feature cards */}
        {features.length > 0 && (
          <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="pwc-rise flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm"
                style={{ animationDelay: `${320 + i * 90}ms` }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(223,192,106,0.14)', color: GOLD }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/60">
                    {f.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleEnter}
          className="pwc-rise group mt-10 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]"
          style={{ animationDelay: `${320 + features.length * 90 + 80}ms`, background: GOLD, color: NAVY }}
        >
          {ctaLabel}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Trust footer */}
        <div
          className="pwc-fade mt-8 flex items-center gap-2 text-xs text-white/45"
          style={{ animationDelay: '900ms' }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Private &amp; confidential · No account or password needed
        </div>
      </div>
    </div>
  )
}

const coverStyles = `
.pwc-root { animation: pwcRoot .5s ease both; }
@keyframes pwcRoot { from { opacity: 0 } to { opacity: 1 } }
.pwc-leaving { animation: pwcLeave .43s ease forwards; }
@keyframes pwcLeave { to { opacity: 0; transform: scale(1.015) } }
.pwc-rise { opacity: 0; transform: translateY(16px); animation: pwcRise .7s cubic-bezier(.22,1,.36,1) both; }
@keyframes pwcRise { to { opacity: 1; transform: none } }
.pwc-fade { opacity: 0; animation: pwcFade .9s ease both; }
@keyframes pwcFade { to { opacity: 1 } }
.pwc-ring { box-shadow: 0 0 0 0 rgba(223,192,106,0.55); animation: pwcPulse 2.8s ease-out infinite; }
@keyframes pwcPulse { 0% { box-shadow: 0 0 0 0 rgba(223,192,106,0.45) } 70% { box-shadow: 0 0 0 16px rgba(223,192,106,0) } 100% { box-shadow: 0 0 0 0 rgba(223,192,106,0) } }
@media (prefers-reduced-motion: reduce) {
  .pwc-root, .pwc-leaving, .pwc-rise, .pwc-fade, .pwc-ring {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`
