'use client'

import { useState, useEffect } from 'react'

const CASE_TYPES = [
  { value: 'medical_malpractice', label: 'Medical Malpractice' },
  { value: 'personal_injury', label: 'Personal Injury' },
  { value: 'product_liability', label: 'Product Liability' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'peer_review', label: 'Peer Review' },
  { value: 'licensing_board', label: 'Licensing Board' },
  { value: 'other', label: 'Other' },
]

const SPECIALTY_AREAS = [
  { value: 'general_anesthesia', label: 'General Anesthesia' },
  { value: 'regional', label: 'Regional Anesthesia' },
  { value: 'obstetric', label: 'Obstetric' },
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'cardiac', label: 'Cardiac' },
  { value: 'neuro', label: 'Neuroanesthesia' },
  { value: 'critical_care', label: 'Critical Care' },
  { value: 'airway_management', label: 'Airway Management' },
  { value: 'sedation', label: 'Sedation' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'pharmacology', label: 'Pharmacology' },
  { value: 'patient_safety', label: 'Patient Safety' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'other', label: 'Other / Unsure' },
]

const SIDES = [
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'defense', label: 'Defense' },
  { value: 'neutral', label: 'Neutral / Court-appointed' },
]

const TURNAROUNDS = [
  { value: 'urgent_1w', label: 'Urgent — within 1 week' },
  { value: 'fast_2w', label: '2 weeks' },
  { value: 'standard_30d', label: '30 days' },
  { value: 'flexible_60d', label: '60 days' },
  { value: 'flexible_90d', label: '90 days or flexible' },
]

export default function ConsultPage() {
  const [source, setSource] = useState<string>('direct')

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organizationName: '',
    caseType: '',
    specialtyArea: '',
    side: '',
    requestedTurnaround: '',
    caseDescription: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('source') || params.get('ref')
    if (s) setSource(s.toLowerCase().slice(0, 40))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/portal/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#0E1F35] px-8 py-6">
            <p className="text-[#DFC06A] text-xs font-semibold tracking-widest uppercase mb-1">Request Received</p>
            <h1 className="text-white text-xl font-serif">Thank You, {form.firstName}</h1>
          </div>
          <div className="h-[3px] bg-[#DFC06A]" />
          <div className="px-8 py-6">
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              Your consultation request has been received. I personally review every inquiry and will reach out to you shortly — typically within one business day.
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              If you would like to reserve a time for an introductory call now, you can use the calendar below.
            </p>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#0E1F35] px-6 py-4">
            <p className="text-[#DFC06A] text-sm font-serif tracking-wide uppercase">Schedule a Consultation Call</p>
          </div>
          <div className="p-0">
            <iframe
              src="https://book.morgen.so/markettingermd/expertcall"
              className="w-full border-0"
              style={{ height: '700px' }}
              title="Schedule a consultation call"
            />
          </div>
        </div>
      </div>
    )
  }

  const inputCls =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DFC06A]/50 focus:border-[#DFC06A]'
  const labelCls =
    'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero / Intro */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="bg-[#0E1F35] px-8 py-8">
          <p className="text-[#DFC06A] text-xs font-semibold tracking-widest uppercase mb-2">Expert Witness — Anesthesiology</p>
          <h1 className="text-white text-2xl md:text-3xl font-serif leading-tight mb-3">
            Mark Ettinger, M.D.
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            Board-certified anesthesiologist available for expert review, written opinion, and testimony in medical malpractice, personal injury, and related matters. Plaintiff, defense, and neutral engagements.
          </p>
        </div>
        <div className="h-[3px] bg-[#DFC06A]" />
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-[11px] font-semibold text-[#DFC06A] tracking-widest uppercase mb-1">Fast Turnaround</p>
              <p className="text-gray-700 text-sm">Initial review typically within 1–2 weeks. Urgent timelines available on request.</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#DFC06A] tracking-widest uppercase mb-1">Direct Communication</p>
              <p className="text-gray-700 text-sm">You work directly with me — not a scheduler. I respond to every inquiry personally.</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#DFC06A] tracking-widest uppercase mb-1">No Obligation</p>
              <p className="text-gray-700 text-sm">Submitting the form opens a conversation. Engagement is only confirmed after we speak.</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Please share a few details about your case below. I will follow up to schedule a conflict check and an introductory call at no charge.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#0E1F35] px-8 py-5">
          <p className="text-[#DFC06A] text-xs font-semibold tracking-widest uppercase mb-1">Consultation Request</p>
          <h2 className="text-white text-lg font-serif">Tell me about your case</h2>
        </div>
        <div className="h-[3px] bg-[#DFC06A]" />

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
              <input type="text" required value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
              <input type="text" required value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inputCls} />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email <span className="text-red-400">*</span></label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls} />
            </div>
          </div>

          {/* Firm */}
          <div>
            <label className={labelCls}>Firm / Organization</label>
            <input type="text" value={form.organizationName}
              onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
              className={inputCls} />
          </div>

          {/* Case type + Side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Case Type</label>
              <select value={form.caseType}
                onChange={(e) => setForm({ ...form, caseType: e.target.value })}
                className={inputCls}>
                <option value="">Select...</option>
                {CASE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Retaining Side</label>
              <select value={form.side}
                onChange={(e) => setForm({ ...form, side: e.target.value })}
                className={inputCls}>
                <option value="">Select...</option>
                {SIDES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specialty + Turnaround */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Clinical Area</label>
              <select value={form.specialtyArea}
                onChange={(e) => setForm({ ...form, specialtyArea: e.target.value })}
                className={inputCls}>
                <option value="">Select...</option>
                {SPECIALTY_AREAS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Requested Turnaround</label>
              <select value={form.requestedTurnaround}
                onChange={(e) => setForm({ ...form, requestedTurnaround: e.target.value })}
                className={inputCls}>
                <option value="">Select...</option>
                {TURNAROUNDS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Case description */}
          <div>
            <label className={labelCls}>Brief Case Description</label>
            <textarea value={form.caseDescription}
              onChange={(e) => setForm({ ...form, caseDescription: e.target.value })}
              rows={5}
              placeholder="A short summary of the events, the clinical issues involved, where the matter stands procedurally, and what you are looking for (record review, written opinion, deposition, trial testimony)..."
              className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-[#0E1F35] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#162d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Submitting...' : 'Submit Consultation Request'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Your information is kept confidential and will only be used to evaluate your case.
          </p>
        </form>
      </div>
    </div>
  )
}
