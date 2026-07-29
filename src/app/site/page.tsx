'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
} from 'lucide-react'

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────────
// Palette: cream (#FAF7F0) bg, navy (#0E1F35) text, gold (#C9A84C) as hairline accent.
// Typography: Source Serif 4 for display, Source Sans 3 for body.
// Style: restrained, editorial, law-firm classical.

const SERIF = 'font-[var(--font-source-serif)]'

// ─── SHARED: SECTION EYEBROW ────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 text-[#8B7A3F]">
      <span className="h-px w-8 bg-[#C9A84C]" />
      <span className={`${SERIF} text-xs tracking-[0.25em] uppercase font-medium`}>
        {children}
      </span>
      <span className="h-px w-8 bg-[#C9A84C]" />
    </div>
  )
}

// ─── NAV ────────────────────────────────────────────────────────────────────────

function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '#about', label: 'About' },
    { href: '#qualifications', label: 'Qualifications' },
    { href: '#expertise', label: 'Practice Areas' },
    { href: '#portal', label: 'Portal' },
    { href: '#contact', label: 'Contact' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FAF7F0]/95 backdrop-blur-sm border-b border-[#E5DFD3]'
          : 'bg-[#FAF7F0] border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo / mark */}
          <a href="#" className="flex items-center gap-4">
            <img
              src="/logo-expert-witness-dark.svg"
              alt="Mark Ettinger, M.D."
              className="w-9 h-9"
            />
            <div className="hidden sm:block border-l border-[#D4CCB8] pl-4">
              <div className={`${SERIF} text-[#0E1F35] text-base font-semibold tracking-wide leading-none`}>
                Mark Ettinger, M.D.
              </div>
              <div className="text-[#8B7A3F] text-[10px] tracking-[0.22em] uppercase mt-1.5">
                Expert Witness &middot; Anesthesiology
              </div>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-[#4A4A44] hover:text-[#0E1F35] transition-colors relative group py-1"
              >
                {l.label}
                <span className="absolute bottom-0 left-0 right-0 h-px bg-[#C9A84C] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </a>
            ))}
            <a
              href="#contact"
              className="ml-2 px-5 py-2.5 bg-[#0E1F35] text-[#FAF7F0] text-xs tracking-[0.15em] uppercase font-medium hover:bg-[#091525] transition-colors"
            >
              Request Consultation
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-[#0E1F35]"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden pb-6 border-t border-[#E5DFD3] pt-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-2 py-3 text-[#4A4A44] hover:text-[#0E1F35] transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="block mx-2 mt-4 px-5 py-3 bg-[#0E1F35] text-[#FAF7F0] text-xs tracking-[0.15em] uppercase font-medium text-center"
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
    <section className="relative bg-[#FAF7F0] pt-32 lg:pt-40 pb-20 lg:pb-28">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Portrait */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="aspect-[4/5] bg-[#EAE2D0] border border-[#D4CCB8] relative overflow-hidden">
                <img
                  src="/ettinger-portrait.png"
                  alt="Mark Ettinger, M.D."
                  className="w-full h-full object-cover object-[center_20%]"
                />
              </div>
              {/* Decorative gold corner marks */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t border-l border-[#C9A84C]" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b border-r border-[#C9A84C]" />
            </div>
          </div>

          {/* Credentials block */}
          <div className="lg:col-span-7">
            <div className={`${SERIF} text-[#8B7A3F] text-xs tracking-[0.3em] uppercase font-medium mb-6`}>
              Expert Witness &middot; Anesthesiology
            </div>

            <h1 className={`${SERIF} text-4xl sm:text-5xl lg:text-6xl text-[#0E1F35] leading-[1.1] tracking-tight font-semibold`}>
              Mark Ettinger,
              <br />
              <span className="italic font-normal">M.D.</span>
            </h1>

            <div className="mt-6 w-16 h-px bg-[#C9A84C]" />

            <p className={`${SERIF} mt-6 text-lg lg:text-xl text-[#3A3A35] leading-relaxed max-w-xl italic`}>
              Rigorous, evidence-based expert analysis in anesthesiology —
              grounded in active clinical practice.
            </p>

            {/* Credential lines */}
            <dl className="mt-10 space-y-3 text-sm">
              {[
                ['Certification', 'Board-Certified, American Board of Anesthesiology (2032)'],
                ['Training', 'The Johns Hopkins Hospital &middot; UT Southwestern'],
                ['Practice', 'President, Meridian Anesthesia &middot; Dallas–Fort Worth'],
                ['Experience', '15+ years clinical &middot; 10+ years expert witness'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col sm:flex-row sm:gap-6">
                  <dt className="text-[#8B7A3F] tracking-[0.15em] uppercase text-[10px] font-semibold sm:w-32 sm:pt-1 sm:flex-shrink-0">
                    {label}
                  </dt>
                  <dd
                    className="text-[#2A2A25] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: value }}
                  />
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-[#0E1F35] text-[#FAF7F0] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#091525] transition-colors"
              >
                Request a Consultation
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="#qualifications"
                className="text-sm text-[#0E1F35] hover:text-[#8B7A3F] transition-colors border-b border-[#C9A84C] pb-0.5"
              >
                View full qualifications
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── ABOUT ──────────────────────────────────────────────────────────────────────

function About() {
  return (
    <section id="about" className="py-24 lg:py-32 bg-white border-t border-[#E5DFD3]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <Eyebrow>About Dr. Ettinger</Eyebrow>
          <h2 className={`${SERIF} mt-6 text-3xl sm:text-4xl lg:text-5xl text-[#0E1F35] font-semibold tracking-tight`}>
            Clinical Depth. <span className="italic font-normal">Analytical Precision.</span>
          </h2>
        </div>

        {/* Prose bio */}
        <div className={`${SERIF} space-y-6 text-[#2A2A25] text-lg leading-[1.75]`}>
          <p className="first-letter:text-6xl first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-[0.9] first-letter:text-[#0E1F35]">
            Mark Ettinger, M.D. is a board-certified anesthesiologist whose expert witness
            practice is informed by more than fifteen years of continuous clinical work.
            Trained at The Johns Hopkins Hospital, he has served as Department Chair,
            Medical Director of a preoperative assessment clinic, and Chair of the Hospital
            Ethics Committee at a 500-bed Level II trauma center.
          </p>
          <p>
            His preparation includes training in both neurological surgery and anesthesiology
            at UT Southwestern, a breadth that informs his approach to cases involving spinal,
            neuraxial, and neurosurgical anesthesia. He currently serves as President of
            Meridian Anesthesia, a division of National Partners in Healthcare, overseeing
            physician anesthesia services across multiple facilities in the Dallas–Fort Worth
            metroplex.
          </p>
          <p>
            Dr. Ettinger has provided expert witness consultation and testimony since 2015
            and accepts retention by both plaintiff and defense. His practice spans general
            anesthesia, regional and neuraxial anesthesia, obstetric anesthesia, critical
            care, and airway management.
          </p>
        </div>

        {/* Quiet credentials list */}
        <div className="mt-16 pt-12 border-t border-[#E5DFD3]">
          <dl className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
            {[
              ['Medical School', 'LSU Health Sciences Center, New Orleans', 'Valedictorian &middot; Alpha Omega Alpha'],
              ['Anesthesiology Residency', 'The Johns Hopkins Hospital', 'Baltimore, Maryland'],
              ['Neurological Surgery', 'UT Southwestern Medical Center', 'Dallas, Texas'],
              ['Board Certification', 'American Board of Anesthesiology', 'Valid through 2032'],
              ['Texas Medical License', 'License #N8184', 'In good standing'],
              ['Global Service', 'Medical Director, Faith in Practice', 'Guatemala &middot; 2014–present'],
            ].map(([label, primary, secondary]) => (
              <div key={label} className="border-l-2 border-[#C9A84C] pl-5 py-1">
                <div className="text-[#8B7A3F] tracking-[0.18em] uppercase text-[10px] font-semibold">
                  {label}
                </div>
                <div className={`${SERIF} text-[#0E1F35] mt-1 font-medium`}>
                  {primary}
                </div>
                <div
                  className="text-sm text-[#6A6A63] mt-0.5"
                  dangerouslySetInnerHTML={{ __html: secondary }}
                />
              </div>
            ))}
          </dl>
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
      note: 'Alpha Omega Alpha &middot; Valedictorian of Class',
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
    <section id="qualifications" className="py-24 lg:py-32 bg-[#FAF7F0] border-t border-[#E5DFD3]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <Eyebrow>Curriculum Vitae</Eyebrow>
          <h2 className={`${SERIF} mt-6 text-3xl sm:text-4xl lg:text-5xl text-[#0E1F35] font-semibold tracking-tight`}>
            Qualifications &amp; <span className="italic font-normal">Experience</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Education */}
          <div>
            <div className="pb-4 mb-8 border-b border-[#C9A84C]">
              <h3 className={`${SERIF} text-xs tracking-[0.3em] uppercase text-[#0E1F35] font-semibold`}>
                Education &amp; Training
              </h3>
            </div>
            <div className="space-y-8">
              {education.map((e, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr] gap-6">
                  <div className="text-[#8B7A3F] text-xs tracking-[0.15em] uppercase font-semibold pt-1 w-28 sm:w-32">
                    {e.years}
                  </div>
                  <div>
                    <div className={`${SERIF} text-[#0E1F35] font-medium text-base leading-snug`}>
                      {e.title}
                    </div>
                    <div className="text-sm text-[#6A6A63] mt-1">{e.institution}</div>
                    {e.note && (
                      <div
                        className={`${SERIF} italic text-sm text-[#8B7A3F] mt-1`}
                        dangerouslySetInnerHTML={{ __html: e.note }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <div className="pb-4 mb-8 border-b border-[#C9A84C]">
              <h3 className={`${SERIF} text-xs tracking-[0.3em] uppercase text-[#0E1F35] font-semibold`}>
                Professional Experience
              </h3>
            </div>
            <div className="space-y-8">
              {experience.map((e, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr] gap-6">
                  <div className="text-[#8B7A3F] text-xs tracking-[0.15em] uppercase font-semibold pt-1 w-28 sm:w-32">
                    {e.years}
                  </div>
                  <div>
                    <div className={`${SERIF} text-[#0E1F35] font-medium text-base leading-snug`}>
                      {e.title}
                    </div>
                    <div className="text-sm text-[#6A6A63] mt-1">{e.institution}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Download CV */}
        <div className="mt-16 pt-12 border-t border-[#E5DFD3] flex items-center justify-center">
          <a
            href="/ettinger-cv.pdf"
            target="_blank"
            className="inline-flex items-center gap-3 px-7 py-3.5 bg-[#0E1F35] text-[#FAF7F0] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#091525] transition-colors"
          >
            <FileText className="w-4 h-4" />
            Full Curriculum Vitae
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── AREAS OF EXPERTISE ─────────────────────────────────────────────────────────

function Expertise() {
  const primary = [
    'General Anesthesia',
    'Airway Management & Difficult Intubation',
    'Obstetric Anesthesia',
    'Regional & Neuraxial Anesthesia',
    'Critical Care & ICU Management',
  ]

  const subspecialty = [
    'Preoperative Evaluation',
    'Postoperative Complications',
    'Anesthesia Informed Consent',
    'Medication Errors',
    'Equipment Malfunction',
    'Vicarious Liability & Supervision',
  ]

  return (
    <section id="expertise" className="py-24 lg:py-32 bg-white border-t border-[#E5DFD3]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <Eyebrow>Practice Areas</Eyebrow>
          <h2 className={`${SERIF} mt-6 text-3xl sm:text-4xl lg:text-5xl text-[#0E1F35] font-semibold tracking-tight`}>
            Areas of <span className="italic font-normal">Expertise</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Prose */}
          <div className={`${SERIF} text-[#2A2A25] text-lg leading-[1.8]`}>
            <p>
              Expert opinions grounded in active clinical practice and deep subspecialty
              knowledge across the full spectrum of anesthesiology. Dr. Ettinger personally
              reviews every case he accepts and declines cases where his expertise is not
              well-matched to the medical issues presented.
            </p>
            <p className="mt-6">
              Opinions are offered only after comprehensive review of records and applicable
              literature, and are framed with reference to the standard of care as it existed
              at the time and place of the care in question.
            </p>
          </div>

          {/* Two lists */}
          <div className="grid sm:grid-cols-2 gap-10">
            <div>
              <div className="pb-3 mb-5 border-b border-[#C9A84C]">
                <h3 className={`${SERIF} text-xs tracking-[0.25em] uppercase text-[#0E1F35] font-semibold`}>
                  Clinical Domains
                </h3>
              </div>
              <ul className="space-y-3">
                {primary.map((item) => (
                  <li key={item} className={`${SERIF} text-[#2A2A25] text-[15px] leading-snug pl-4 relative`}>
                    <span className="absolute left-0 top-2 w-1.5 h-px bg-[#C9A84C]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="pb-3 mb-5 border-b border-[#C9A84C]">
                <h3 className={`${SERIF} text-xs tracking-[0.25em] uppercase text-[#0E1F35] font-semibold`}>
                  Frequently Addressed
                </h3>
              </div>
              <ul className="space-y-3">
                {subspecialty.map((item) => (
                  <li key={item} className={`${SERIF} text-[#2A2A25] text-[15px] leading-snug pl-4 relative`}>
                    <span className="absolute left-0 top-2 w-1.5 h-px bg-[#C9A84C]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


// ─── PORTAL (compact, moved below case history) ─────────────────────────────────

function PortalSection() {
  const bullets = [
    'Secure document exchange and HIPAA-compliant messaging',
    'Real-time case status and milestone tracking',
    'Inline review and revision of draft expert reports',
    'Transparent billing with itemized time entries',
  ]

  return (
    <section id="portal" className="py-24 lg:py-32 bg-white border-t border-[#E5DFD3]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <Eyebrow>Attorney Portal</Eyebrow>
            <h2 className={`${SERIF} mt-6 text-3xl sm:text-4xl text-[#0E1F35] font-semibold tracking-tight leading-tight`}>
              A dedicated <span className="italic font-normal">workspace</span> for each case.
            </h2>
          </div>

          <div className="lg:col-span-7">
            <p className={`${SERIF} text-[#2A2A25] text-lg leading-[1.8]`}>
              Every retaining attorney receives a secure, case-linked portal for document
              exchange, messaging, draft report review, and scheduling — from initial
              retention through trial testimony. All correspondence is preserved in the
              case record.
            </p>

            <ul className="mt-8 space-y-3">
              {bullets.map((b) => (
                <li
                  key={b}
                  className={`${SERIF} text-[#2A2A25] text-[15px] leading-relaxed pl-5 relative`}
                >
                  <span className="absolute left-0 top-2.5 w-2 h-px bg-[#C9A84C]" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <a
                href="/portal/consult"
                className="inline-flex items-center gap-3 text-sm text-[#0E1F35] hover:text-[#8B7A3F] transition-colors border-b border-[#C9A84C] pb-0.5"
              >
                Submit a case inquiry
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── CONTACT ────────────────────────────────────────────────────────────────────

function Contact() {
  return (
    <section id="contact" className="py-24 lg:py-32 bg-[#FAF7F0] border-t border-[#E5DFD3]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <Eyebrow>Get In Touch</Eyebrow>
          <h2 className={`${SERIF} mt-6 text-3xl sm:text-4xl lg:text-5xl text-[#0E1F35] font-semibold tracking-tight`}>
            Request a <span className="italic font-normal">Consultation</span>
          </h2>
          <p className={`${SERIF} mt-6 text-[#6A6A63] max-w-xl mx-auto italic`}>
            Initial consultations are available by phone or video call.
            Case screening is provided at no charge.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-px bg-[#E5DFD3] border border-[#E5DFD3]">
          {[
            {
              icon: Phone,
              title: 'Direct Line',
              value: '(214) 930-4698',
              link: 'tel:+12149304698',
            },
            {
              icon: Mail,
              title: 'Email',
              value: 'markettingermd@gmail.com',
              link: 'mailto:markettingermd@gmail.com',
            },
            {
              icon: MapPin,
              title: 'Location',
              value: 'Dallas–Fort Worth, Texas',
              desc: 'Available nationwide',
              link: null,
            },
          ].map((c) => (
            <div key={c.title} className="bg-white p-8 text-center">
              <c.icon className="w-5 h-5 text-[#C9A84C] mx-auto mb-4" />
              <div className={`${SERIF} text-[10px] tracking-[0.25em] uppercase text-[#8B7A3F] font-semibold`}>
                {c.title}
              </div>
              {c.link ? (
                <a
                  href={c.link}
                  className={`${SERIF} text-[#0E1F35] mt-3 block hover:text-[#8B7A3F] transition-colors`}
                >
                  {c.value}
                </a>
              ) : (
                <div className={`${SERIF} text-[#0E1F35] mt-3`}>{c.value}</div>
              )}
              {c.desc && (
                <div className="text-xs text-[#6A6A63] mt-1 italic">{c.desc}</div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href="/portal/consult"
            className="inline-flex items-center gap-3 px-7 py-3.5 bg-[#0E1F35] text-[#FAF7F0] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#091525] transition-colors"
          >
            Submit Case for Screening
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#0E1F35] text-[#FAF7F0]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <img
              src="/logo-expert-witness-dark.svg"
              alt=""
              className="w-9 h-9"
            />
            <div>
              <div className={`${SERIF} text-[#FAF7F0] text-base font-semibold`}>
                Mark Ettinger, M.D.
              </div>
              <div className="text-[#C9A84C] text-[10px] tracking-[0.22em] uppercase mt-1">
                Expert Witness &middot; Anesthesiology
              </div>
            </div>
          </div>

          <div className="text-xs text-[#B8B0A0] space-y-1 md:text-right">
            <div>Board-Certified, American Board of Anesthesiology</div>
            <div>Texas Medical License #N8184</div>
          </div>
        </div>

        <div className={`${SERIF} mt-8 text-[11px] text-[#8B8070] italic leading-relaxed max-w-3xl`}>
          &copy; {new Date().getFullYear()} Mark Ettinger, M.D. All rights reserved.
          This website is provided for informational purposes only and does not
          constitute medical or legal advice. Past results do not guarantee
          future outcomes.
        </div>
      </div>
    </footer>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────────────────────

export default function SitePage() {
  return (
    <div className="font-[var(--font-source-sans)] bg-[#FAF7F0] text-[#2A2A25]">
      <SiteNav />
      <Hero />
      <About />
      <Qualifications />
      <Expertise />
      <PortalSection />
      <Contact />
      <Footer />
    </div>
  )
}
