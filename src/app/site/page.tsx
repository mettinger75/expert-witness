'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  BookOpen,
  Scale,
  Clock,
  FileText,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronRight,
  Award,
  GraduationCap,
  Stethoscope,
  Users,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Monitor,
  Bell,
  Lock,
  BarChart3,
  Upload,
  Video,
  Globe,
  Heart,
} from 'lucide-react'

// ─── NAV ────────────────────────────────────────────────────────────────────────

function SiteNav() {
  const [open, setOpen] = useState(false)
  const links = [
    { href: '#about', label: 'About' },
    { href: '#qualifications', label: 'Qualifications' },
    { href: '#portal', label: 'Attorney Portal' },
    { href: '#fees', label: 'Fee Schedule' },
    { href: '#cases', label: 'Case History' },
    { href: '#contact', label: 'Contact' },
  ]
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#091525]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <img
              src="/logo-expert-witness-dark.svg"
              alt="Star logo"
              className="w-10 h-10 rounded-lg"
            />
            <div className="hidden sm:block">
              <div className="text-white font-semibold text-sm tracking-wide">
                MARK ETTINGER, M.D.
              </div>
              <div className="text-[#DFC06A] text-xs tracking-widest uppercase">
                Expert Witness
              </div>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-4 py-2 text-sm text-gray-300 hover:text-[#DFC06A] transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              className="ml-4 px-5 py-2.5 bg-gradient-to-r from-[#DFC06A] to-[#C9A84C] text-[#091525] text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-[#DFC06A]/20 transition-all duration-200"
            >
              Request Consultation
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-gray-300 hover:text-white"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden pb-6 border-t border-white/10 pt-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-gray-300 hover:text-[#DFC06A] transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="block mx-4 mt-4 px-5 py-3 bg-gradient-to-r from-[#DFC06A] to-[#C9A84C] text-[#091525] text-sm font-semibold rounded-lg text-center"
            >
              Request Consultation
            </a>
          </div>
        )}
      </div>
    </nav>
  )
}

// ─── HERO ───────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-[#091525] overflow-hidden">
      {/* Gradient overlays */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#091525] via-[#0E1F35] to-[#152A42]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#DFC06A]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#1C3555]/50 rounded-full blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#DFC06A]/30 bg-[#DFC06A]/10 mb-8">
            <Shield className="w-4 h-4 text-[#DFC06A]" />
            <span className="text-[#DFC06A] text-sm font-medium tracking-wide">
              Board-Certified Anesthesiologist &bull; Johns Hopkins Trained
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight">
            Expert Witness in{' '}
            <span className="bg-gradient-to-r from-[#DFC06A] to-[#E8D48A] bg-clip-text text-transparent">
              Anesthesiology
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl">
            Providing rigorous, evidence-based expert analysis for medical malpractice
            and personal injury litigation. Over a decade of expert witness experience
            backed by active clinical practice and academic leadership.
          </p>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { val: '10+', label: 'Years Expert Witness' },
              { val: '15+', label: 'Years Clinical Practice' },
              { val: '50+', label: 'Cases Reviewed' },
              { val: 'ABA', label: 'Board Certified' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-[#DFC06A]">{s.val}</div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#DFC06A] to-[#C9A84C] text-[#091525] font-semibold rounded-xl hover:shadow-lg hover:shadow-[#DFC06A]/25 transition-all duration-300 text-base"
            >
              Request a Consultation
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#qualifications"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition-all duration-300 text-base"
            >
              View Qualifications
            </a>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F0F2F5] to-transparent" />
    </section>
  )
}

// ─── ABOUT ──────────────────────────────────────────────────────────────────────

function About() {
  return (
    <section id="about" className="py-24 bg-[#F0F2F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#091525]/5 text-[#091525] text-sm font-medium mb-6">
              <Stethoscope className="w-4 h-4 text-[#C9A84C]" />
              About Dr. Ettinger
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#091525] leading-tight">
              Clinical Depth Meets{' '}
              <span className="text-[#C9A84C]">Analytical Precision</span>
            </h2>
            <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
              <p>
                Dr. Mark Ettinger is a board-certified anesthesiologist who brings over
                15 years of clinical experience to his expert witness practice. Trained at
                The Johns Hopkins Hospital, he has served as Department Chair, Medical Director
                of a preoperative assessment clinic, and Ethics Committee Chair at a 500-bed
                Level II trauma center.
              </p>
              <p>
                His unique background includes training in both neurological surgery and
                anesthesiology at UT Southwestern, providing an unusually broad clinical
                perspective. He currently serves as President of Meridian Anesthesia, a
                division of National Partners in Healthcare, overseeing physician anesthesia
                services across multiple facilities in the Dallas&ndash;Fort Worth metroplex.
              </p>
              <p>
                Dr. Ettinger has provided expert witness consultation and testimony since
                2015, accepting cases for both plaintiff and defense. His practice spans
                general anesthesia, regional and neuraxial anesthesia, obstetric anesthesia,
                critical care, pain management, and airway management.
              </p>
            </div>
          </div>

          {/* Right: highlights */}
          <div className="space-y-4">
            {[
              {
                icon: GraduationCap,
                title: 'Johns Hopkins Trained',
                desc: 'Anesthesiology residency at The Johns Hopkins Hospital. Prior neurological surgery and general surgery training at UT Southwestern.',
              },
              {
                icon: Award,
                title: 'Academic Excellence',
                desc: 'Alpha Omega Alpha honor society. Valedictorian, LSU Health Sciences Center School of Medicine.',
              },
              {
                icon: Users,
                title: 'Department Leadership',
                desc: 'Former Chair of Anesthesiology, Ethics Committee Chair, and Director of Preoperative Assessment at Medical City Arlington.',
              },
              {
                icon: Heart,
                title: 'Global Service',
                desc: 'Medical Director for Faith in Practice mission trips in Guatemala since 2014, providing surgical care to underserved communities.',
              },
              {
                icon: Scale,
                title: 'Balanced Perspective',
                desc: 'Accepts cases for both plaintiff and defense. Committed to objective, evidence-based analysis regardless of retaining party.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 p-5 bg-white rounded-xl border border-gray-200/80 hover:border-[#C9A84C]/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-[#091525] flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#DFC06A]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#091525]">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── QUALIFICATIONS ─────────────────────────────────────────────────────────────

function Qualifications() {
  const education = [
    {
      years: '2008 – 2011',
      title: 'Residency in Anesthesiology',
      institution: 'The Johns Hopkins Hospital, Baltimore, Maryland',
    },
    {
      years: '2006 – 2008',
      title: 'Residency in Neurological Surgery',
      institution: 'University of Texas Southwestern, Dallas, Texas',
    },
    {
      years: '2005 – 2006',
      title: 'Internship in General Surgery',
      institution: 'University of Texas Southwestern, Dallas, Texas',
    },
    {
      years: '2001 – 2005',
      title: 'Doctor of Medicine',
      institution: 'LSU Health Sciences Center, New Orleans, Louisiana',
      note: 'Alpha Omega Alpha • Valedictorian of Class',
    },
  ]

  const experience = [
    {
      years: '2025 – Present',
      title: 'President, Meridian Anesthesia',
      institution: 'National Partners in Healthcare, Dallas, Texas',
    },
    {
      years: '2011 – 2025',
      title: 'Anesthesiologist & Managing Partner',
      institution: 'Metropolitan Anesthesia Consultants, Dallas, Texas',
    },
    {
      years: '2023 – 2025',
      title: 'Chair, Department of Anesthesiology',
      institution: 'Medical City Arlington, Arlington, Texas',
    },
    {
      years: '2023 – 2025',
      title: 'Director, Preoperative Assessment Clinic',
      institution: 'Medical City Arlington, Arlington, Texas',
    },
    {
      years: '2015 – 2025',
      title: 'Chair, Hospital Ethics Committee',
      institution: 'Medical City Arlington, Arlington, Texas',
    },
    {
      years: '2015 – Present',
      title: 'Expert Witness in Anesthesiology',
      institution: 'Independent Consultant',
    },
  ]

  return (
    <section id="qualifications" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#091525]/5 text-[#091525] text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4 text-[#C9A84C]" />
            Curriculum Vitae
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#091525]">
            Qualifications & Experience
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Board-certified by the American Board of Anesthesiology (certification valid
            through 2032). Licensed in the State of Texas.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Education */}
          <div>
            <h3 className="text-xl font-bold text-[#091525] mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#C9A84C]" />
              Education & Training
            </h3>
            <div className="space-y-1">
              {education.map((e, i) => (
                <div
                  key={i}
                  className="relative pl-6 pb-6 border-l-2 border-gray-200 last:border-transparent last:pb-0"
                >
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#C9A84C] border-2 border-white" />
                  <div className="text-xs text-[#C9A84C] font-semibold tracking-wider uppercase">
                    {e.years}
                  </div>
                  <div className="font-semibold text-[#091525] mt-1">{e.title}</div>
                  <div className="text-sm text-gray-500">{e.institution}</div>
                  {e.note && (
                    <div className="text-sm text-[#C9A84C] italic mt-1">{e.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <h3 className="text-xl font-bold text-[#091525] mb-6 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#C9A84C]" />
              Professional Experience
            </h3>
            <div className="space-y-1">
              {experience.map((e, i) => (
                <div
                  key={i}
                  className="relative pl-6 pb-6 border-l-2 border-gray-200 last:border-transparent last:pb-0"
                >
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#091525] border-2 border-white" />
                  <div className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
                    {e.years}
                  </div>
                  <div className="font-semibold text-[#091525] mt-1">{e.title}</div>
                  <div className="text-sm text-gray-500">{e.institution}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Download CV */}
        <div className="mt-12 text-center">
          <a
            href="/ettinger-cv.pdf"
            target="_blank"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#091525] text-white font-medium rounded-xl hover:bg-[#0E1F35] transition-colors"
          >
            <FileText className="w-5 h-5" />
            Download Full CV (PDF)
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── AREAS OF EXPERTISE ─────────────────────────────────────────────────────────

function Expertise() {
  const areas = [
    {
      icon: Stethoscope,
      title: 'General Anesthesia',
      desc: 'Induction, maintenance, emergence, and recovery from general anesthesia across all surgical specialties.',
    },
    {
      icon: Shield,
      title: 'Airway Management',
      desc: 'Difficult airway assessment, management algorithms, intubation techniques, and emergency airway scenarios.',
    },
    {
      icon: Heart,
      title: 'Critical Care',
      desc: 'ICU management, hemodynamic monitoring, ventilator management, and perioperative critical care.',
    },
    {
      icon: Users,
      title: 'Obstetric Anesthesia',
      desc: 'Labor epidurals, cesarean section anesthesia, high-risk obstetric management, and neonatal resuscitation.',
    },
    {
      icon: BarChart3,
      title: 'Regional & Neuraxial',
      desc: 'Spinal, epidural, and peripheral nerve blocks. Complications including spinal cord injury and nerve damage.',
    },
    {
      icon: Clock,
      title: 'Pain Management',
      desc: 'Acute and chronic pain treatment, interventional procedures, and multimodal analgesic protocols.',
    },
  ]

  return (
    <section className="py-24 bg-[#F0F2F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#091525]/5 text-[#091525] text-sm font-medium mb-4">
            <Shield className="w-4 h-4 text-[#C9A84C]" />
            Practice Areas
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#091525]">
            Areas of Expertise
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Expert opinions grounded in active clinical practice and deep subspecialty
            knowledge across the full spectrum of anesthesiology.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((a) => (
            <div
              key={a.title}
              className="bg-white rounded-xl p-6 border border-gray-200/80 hover:border-[#C9A84C]/30 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#091525] flex items-center justify-center mb-4 group-hover:bg-[#0E1F35] transition-colors">
                <a.icon className="w-6 h-6 text-[#DFC06A]" />
              </div>
              <h3 className="text-lg font-semibold text-[#091525]">{a.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── PORTAL FEATURE ─────────────────────────────────────────────────────────────

function PortalSection() {
  const features = [
    {
      icon: Monitor,
      title: 'Real-Time Case Dashboard',
      desc: 'Check in on your case anytime. See current status, milestones reached, and what comes next — all in one view.',
    },
    {
      icon: Upload,
      title: 'Secure Document Exchange',
      desc: 'Upload medical records, pleadings, and supplemental materials directly through the portal. No more lost attachments.',
    },
    {
      icon: MessageSquare,
      title: 'Integrated Messaging',
      desc: 'Communicate directly with Dr. Ettinger through secure, case-linked messaging. Every conversation is preserved in the case record.',
    },
    {
      icon: FileText,
      title: 'Collaborative Report Review',
      desc: 'Review expert report drafts with inline comments. Track revisions with a visual timeline showing every change and approval.',
    },
    {
      icon: Calendar,
      title: 'Schedule Consultations & Depositions',
      desc: 'Request initial consultations, schedule deposition preparation sessions, and coordinate trial appearance dates.',
    },
    {
      icon: Bell,
      title: 'Automated Notifications',
      desc: 'Receive email updates when reports are ready for review, documents are uploaded, or milestones are completed.',
    },
    {
      icon: BarChart3,
      title: 'Billing Transparency',
      desc: 'View detailed billing breakdowns, track invoices, and see time entry summaries — complete financial transparency.',
    },
    {
      icon: Lock,
      title: 'Bank-Grade Security',
      desc: 'All data encrypted in transit and at rest. Token-based portal access with no shared passwords. HIPAA-compliant infrastructure.',
    },
  ]

  return (
    <section id="portal" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#091525]/5 text-[#091525] text-sm font-medium mb-4">
            <Globe className="w-4 h-4 text-[#C9A84C]" />
            Attorney Portal
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#091525]">
            A Better Way to <span className="text-[#C9A84C]">Collaborate</span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Every retaining attorney receives a dedicated, secure portal — streamlining
            communication and transparency from retention through trial.
          </p>
        </div>

        {/* Portal workflow illustration */}
        <div className="relative mb-20">
          <div className="bg-gradient-to-br from-[#091525] to-[#152A42] rounded-2xl p-8 lg:p-12 overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#DFC06A]/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1C3555]/50 rounded-full blur-[80px]" />

            <div className="relative">
              <h3 className="text-2xl font-bold text-white mb-2">
                How the Portal Works
              </h3>
              <p className="text-gray-400 mb-10 max-w-xl">
                From initial case intake to final report delivery, the portal keeps you
                informed and in control at every step.
              </p>

              {/* Workflow steps */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    step: '01',
                    title: 'Case Onboarding',
                    desc: 'Sign retention agreement electronically. Upload initial records through secure portal.',
                    icon: FileText,
                  },
                  {
                    step: '02',
                    title: 'Record Review & Analysis',
                    desc: 'Track review progress in real time. Ask questions and provide context through messaging.',
                    icon: BookOpen,
                  },
                  {
                    step: '03',
                    title: 'Report Collaboration',
                    desc: 'Review draft reports with inline markup. Request revisions with visual change tracking.',
                    icon: MessageSquare,
                  },
                  {
                    step: '04',
                    title: 'Testimony Preparation',
                    desc: 'Schedule depositions and trial dates. Coordinate preparation sessions directly.',
                    icon: Video,
                  },
                ].map((s, i) => (
                  <div key={i} className="relative">
                    <div className="text-[#DFC06A] text-xs font-bold tracking-widest mb-3">
                      STEP {s.step}
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-[#DFC06A]/30 transition-all duration-300">
                      <div className="w-10 h-10 rounded-lg bg-[#DFC06A]/10 flex items-center justify-center mb-3">
                        <s.icon className="w-5 h-5 text-[#DFC06A]" />
                      </div>
                      <h4 className="font-semibold text-white text-sm">{s.title}</h4>
                      <p className="text-sm text-gray-400 mt-2 leading-relaxed">{s.desc}</p>
                    </div>
                    {/* Connector arrow (not on last) */}
                    {i < 3 && (
                      <div className="hidden lg:block absolute top-1/2 -right-3 translate-x-0">
                        <ChevronRight className="w-5 h-5 text-[#DFC06A]/30" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl border border-gray-200/80 hover:border-[#C9A84C]/30 hover:shadow-md transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#091525] flex items-center justify-center mb-3 group-hover:bg-[#0E1F35] transition-colors">
                <f.icon className="w-5 h-5 text-[#DFC06A]" />
              </div>
              <h4 className="font-semibold text-[#091525] text-sm">{f.title}</h4>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FEE SCHEDULE ───────────────────────────────────────────────────────────────

function FeeSchedule() {
  const fees = [
    { activity: 'Initial Case Review & Consultation', rate: '$500', unit: 'per hour' },
    { activity: 'Medical Record Review', rate: '$500', unit: 'per hour' },
    { activity: 'Research & Literature Review', rate: '$500', unit: 'per hour' },
    { activity: 'Report Writing', rate: '$500', unit: 'per hour' },
    { activity: 'Deposition Preparation', rate: '$500', unit: 'per hour' },
    { activity: 'Deposition Testimony', rate: '$750', unit: 'per hour' },
    { activity: 'Trial Preparation', rate: '$500', unit: 'per hour' },
    { activity: 'Trial Testimony', rate: '$750', unit: 'per hour' },
    { activity: 'Phone & Video Conferences', rate: '$500', unit: 'per hour' },
    { activity: 'Travel Time', rate: '$250', unit: 'per hour' },
  ]

  return (
    <section id="fees" className="py-24 bg-[#F0F2F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#091525]/5 text-[#091525] text-sm font-medium mb-4">
            <Scale className="w-4 h-4 text-[#C9A84C]" />
            Fee Schedule
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#091525]">
            Transparent Fee Structure
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            All fees are clearly communicated upfront. Detailed billing is available
            through the attorney portal with itemized time entries.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-[#091525] px-6 py-4 flex items-center justify-between">
              <span className="text-white font-semibold">Activity</span>
              <span className="text-white font-semibold">Rate</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {fees.map((f, i) => (
                <div
                  key={f.activity}
                  className={`px-6 py-4 flex items-center justify-between ${
                    i % 2 === 1 ? 'bg-[#FAFBFC]' : ''
                  }`}
                >
                  <span className="text-[#091525] font-medium text-sm">{f.activity}</span>
                  <div className="text-right">
                    <span className="text-[#091525] font-semibold">{f.rate}</span>
                    <span className="text-gray-400 text-sm ml-1">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div className="bg-[#FAFBFC] px-6 py-4 border-t border-gray-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C9A84C] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-500">
                  A non-refundable retainer of $2,500 is required at the time of
                  retention. The retainer is applied to the final invoice. Billing
                  is in 0.1-hour increments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── CASE HISTORY ───────────────────────────────────────────────────────────────

interface CaseData {
  year: string
  side: string
  specialty: string
  caseType: string
  involvement: string
}

interface CaseStats {
  total: number
  plaintiff: number
  defense: number
  depositionsAndTrials: number
}

function CaseHistory() {
  const [expanded, setExpanded] = useState(false)
  const [cases, setCases] = useState<CaseData[]>([])
  const [stats, setStats] = useState<CaseStats>({ total: 0, plaintiff: 0, defense: 0, depositionsAndTrials: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/site/cases')
      .then((res) => res.json())
      .then((data) => {
        setCases(data.cases || [])
        setStats(data.stats || { total: 0, plaintiff: 0, defense: 0, depositionsAndTrials: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const displayCases = expanded ? cases : cases.slice(0, 10)

  return (
    <section id="cases" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#091525]/5 text-[#091525] text-sm font-medium mb-4">
            <Scale className="w-4 h-4 text-[#C9A84C]" />
            Case History
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#091525]">
            Recent Expert Witness Cases
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Cases shown are drawn directly from Dr. Ettinger&apos;s active practice. Case names
            and identifying details are confidential.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Cases', value: String(stats.total) },
            { label: 'Plaintiff', value: String(stats.plaintiff) },
            { label: 'Defense', value: String(stats.defense) },
            { label: 'Depositions & Trials', value: String(stats.depositionsAndTrials) },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#F8F9FB] rounded-xl p-4 text-center border border-gray-100"
            >
              <div className="text-2xl font-bold text-[#091525]">{loading ? '—' : s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Desktop header */}
          <div className="hidden sm:grid sm:grid-cols-12 bg-[#091525] px-6 py-3 gap-4">
            <span className="col-span-1 text-white text-xs font-semibold tracking-wider">YEAR</span>
            <span className="col-span-2 text-white text-xs font-semibold tracking-wider">SIDE</span>
            <span className="col-span-3 text-white text-xs font-semibold tracking-wider">SPECIALTY</span>
            <span className="col-span-3 text-white text-xs font-semibold tracking-wider">INVOLVEMENT</span>
            <span className="col-span-3 text-white text-xs font-semibold tracking-wider">TYPE</span>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-gray-400">Loading cases...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayCases.map((c, i) => (
                <div
                  key={i}
                  className={`px-6 py-3.5 ${i % 2 === 1 ? 'bg-[#FAFBFC]' : ''}`}
                >
                  {/* Desktop */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-4 items-center">
                    <span className="col-span-1 text-sm text-gray-500 font-medium">
                      {c.year}
                    </span>
                    <span className="col-span-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.side === 'Plaintiff'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-orange-50 text-orange-700'
                        }`}
                      >
                        {c.side}
                      </span>
                    </span>
                    <span className="col-span-3 text-sm text-[#091525] font-medium">
                      {c.specialty}
                    </span>
                    <span className="col-span-3 text-sm text-gray-500">{c.involvement}</span>
                    <span className="col-span-3 text-xs text-gray-400">{c.caseType}</span>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.side === 'Plaintiff'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-orange-50 text-orange-700'
                        }`}
                      >
                        {c.side}
                      </span>
                      <span className="text-xs text-gray-400">{c.year}</span>
                    </div>
                    <div className="text-sm text-[#091525] font-medium">{c.specialty}</div>
                    <div className="text-xs text-gray-400">{c.involvement} &bull; {c.caseType}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!expanded && cases.length > 10 && (
          <div className="text-center mt-8">
            <button
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-[#091525] font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Show All {cases.length} Cases
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── CONTACT ────────────────────────────────────────────────────────────────────

function Contact() {
  return (
    <section id="contact" className="py-24 bg-[#091525] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#DFC06A]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#1C3555]/50 rounded-full blur-[80px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#DFC06A]/30 bg-[#DFC06A]/10 text-[#DFC06A] text-sm font-medium mb-4">
            <MessageSquare className="w-4 h-4" />
            Get in Touch
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Request a Consultation
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Contact Dr. Ettinger to discuss your case. Initial consultations are available
            by phone or video call. Case screening is provided at no charge.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: Phone,
              title: 'Phone',
              value: '(214) 930-4698',
              link: 'tel:+12149304698',
              desc: 'Direct line for case inquiries',
            },
            {
              icon: Mail,
              title: 'Email',
              value: 'markettingermd@gmail.com',
              link: 'mailto:markettingermd@gmail.com',
              desc: 'Typically responds within 24 hours',
            },
            {
              icon: MapPin,
              title: 'Location',
              value: 'Dallas–Fort Worth, Texas',
              link: null,
              desc: 'Available for cases nationwide',
            },
          ].map((c) => (
            <div
              key={c.title}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:border-[#DFC06A]/30 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-[#DFC06A]/10 flex items-center justify-center mx-auto mb-4">
                <c.icon className="w-6 h-6 text-[#DFC06A]" />
              </div>
              <h3 className="font-semibold text-white">{c.title}</h3>
              {c.link ? (
                <a
                  href={c.link}
                  className="text-[#DFC06A] hover:underline mt-1 block text-sm"
                >
                  {c.value}
                </a>
              ) : (
                <span className="text-gray-300 mt-1 block text-sm">{c.value}</span>
              )}
              <p className="text-xs text-gray-500 mt-2">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm mb-4">
            Prefer to submit a case for screening online?
          </p>
          <a
            href="/portal/consult"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#DFC06A] to-[#C9A84C] text-[#091525] font-semibold rounded-xl hover:shadow-lg hover:shadow-[#DFC06A]/20 transition-all duration-300"
          >
            Submit a Case Inquiry
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#060E19] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-expert-witness-dark.svg"
              alt="Star logo"
              className="w-8 h-8 rounded-lg"
            />
            <div>
              <div className="text-white text-sm font-semibold">Mark Ettinger, M.D.</div>
              <div className="text-gray-500 text-xs">Expert Witness in Anesthesiology</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>Board-Certified, American Board of Anesthesiology</span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline">Texas License #N8184</span>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} Mark Ettinger, M.D. All rights reserved. This
          website is for informational purposes only and does not constitute medical or legal
          advice.
        </div>
      </div>
    </footer>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────────────────────

export default function SitePage() {
  return (
    <div className="font-[var(--font-source-sans)]">
      <SiteNav />
      <Hero />
      <About />
      <Qualifications />
      <Expertise />
      <PortalSection />
      <FeeSchedule />
      <CaseHistory />
      <Contact />
      <Footer />
    </div>
  )
}
