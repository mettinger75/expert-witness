// Case Statuses
export const CASE_STATUSES = [
  { value: 'inquiry', label: 'Inquiry', color: 'slate' },
  { value: 'conflict_check', label: 'Conflict Check', color: 'yellow' },
  { value: 'accepted', label: 'Accepted', color: 'blue' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'opinion_issued', label: 'Opinion Issued', color: 'purple' },
  { value: 'deposition_scheduled', label: 'Deposition Scheduled', color: 'orange' },
  { value: 'deposition_complete', label: 'Deposition Complete', color: 'purple' },
  { value: 'trial_scheduled', label: 'Trial Scheduled', color: 'orange' },
  { value: 'trial_complete', label: 'Trial Complete', color: 'purple' },
  { value: 'closed', label: 'Closed', color: 'gray' },
  { value: 'declined', label: 'Declined', color: 'red' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'red' },
] as const

// Case Types
export const CASE_TYPES = [
  { value: 'medical_malpractice', label: 'Medical Malpractice' },
  { value: 'personal_injury', label: 'Personal Injury' },
  { value: 'product_liability', label: 'Product Liability' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'peer_review', label: 'Peer Review' },
  { value: 'licensing_board', label: 'Licensing Board' },
  { value: 'other', label: 'Other' },
] as const

// Case Sides
export const CASE_SIDES = [
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'defense', label: 'Defense' },
  { value: 'neutral', label: 'Neutral' },
] as const

// Case Priorities
export const CASE_PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'red' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'low', label: 'Low', color: 'gray' },
] as const

// Specialty Areas
export const SPECIALTY_AREAS = [
  { value: 'general_anesthesia', label: 'General Anesthesia' },
  { value: 'regional_anesthesia', label: 'Regional Anesthesia' },
  { value: 'neuraxial', label: 'Neuraxial Anesthesia' },
  { value: 'obstetric_anesthesia', label: 'Obstetric Anesthesia' },
  { value: 'pediatric_anesthesia', label: 'Pediatric Anesthesia' },
  { value: 'cardiac_anesthesia', label: 'Cardiac Anesthesia' },
  { value: 'pain_management', label: 'Pain Management' },
  { value: 'critical_care', label: 'Critical Care' },
  { value: 'airway_management', label: 'Airway Management' },
  { value: 'sedation', label: 'Sedation' },
  { value: 'monitoring', label: 'Monitoring Standards' },
  { value: 'pharmacology', label: 'Pharmacology' },
  { value: 'patient_safety', label: 'Patient Safety' },
  { value: 'simulation', label: 'Simulation & Training' },
  { value: 'other', label: 'Other' },
] as const

// Contact Types
export const CONTACT_TYPES = [
  { value: 'attorney', label: 'Attorney' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'expert', label: 'Expert Witness' },
  { value: 'physician', label: 'Physician' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'patient', label: 'Patient' },
  { value: 'insurance', label: 'Insurance Representative' },
  { value: 'court', label: 'Court Personnel' },
  { value: 'other', label: 'Other' },
] as const

// Case Contact Roles
export const CASE_CONTACT_ROLES = [
  { value: 'retaining_attorney', label: 'Retaining Attorney' },
  { value: 'opposing_attorney', label: 'Opposing Attorney' },
  { value: 'co_counsel', label: 'Co-Counsel' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'defendant_physician', label: 'Defendant Physician' },
  { value: 'treating_physician', label: 'Treating Physician' },
  { value: 'co_defendant', label: 'Co-Defendant' },
  { value: 'opposing_expert', label: 'Opposing Expert' },
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'defendant', label: 'Defendant' },
  { value: 'witness', label: 'Witness' },
  { value: 'other', label: 'Other' },
] as const

// Document Categories
export const DOCUMENT_CATEGORIES = [
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'anesthesia_record', label: 'Anesthesia Record' },
  { value: 'operative_report', label: 'Operative Report' },
  { value: 'nursing_notes', label: 'Nursing Notes' },
  { value: 'lab_results', label: 'Lab Results' },
  { value: 'imaging', label: 'Imaging Studies' },
  { value: 'pharmacy', label: 'Pharmacy Records' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'pleading', label: 'Pleading' },
  { value: 'deposition', label: 'Deposition Transcript' },
  { value: 'expert_report', label: 'Expert Report' },
  { value: 'literature', label: 'Medical Literature' },
  { value: 'guideline', label: 'Clinical Guideline' },
  { value: 'billing', label: 'Billing Record' },
  { value: 'consent_form', label: 'Consent Form' },
  { value: 'autopsy', label: 'Autopsy Report' },
  { value: 'other', label: 'Other' },
] as const

// Activity Types
export const ACTIVITY_TYPES = [
  { value: 'record_review', label: 'Record Review' },
  { value: 'research', label: 'Research' },
  { value: 'report_writing', label: 'Report Writing' },
  { value: 'deposition_prep', label: 'Deposition Preparation' },
  { value: 'deposition', label: 'Deposition Testimony' },
  { value: 'trial_prep', label: 'Trial Preparation' },
  { value: 'trial', label: 'Trial Testimony' },
  { value: 'conference', label: 'Conference Call' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'travel', label: 'Travel' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
] as const

// Report Types
export const REPORT_TYPES = [
  { value: 'preliminary_opinion', label: 'Preliminary Opinion' },
  { value: 'expert_report', label: 'Expert Report' },
  { value: 'rebuttal_report', label: 'Rebuttal Report' },
  { value: 'supplemental_report', label: 'Supplemental Report' },
  { value: 'affidavit', label: 'Affidavit' },
  { value: 'declaration', label: 'Declaration' },
  { value: 'case_summary', label: 'Case Summary' },
  { value: 'other', label: 'Other' },
] as const

// Invoice Statuses
export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'viewed', label: 'Viewed', color: 'yellow' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'partial', label: 'Partially Paid', color: 'orange' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'void', label: 'Void', color: 'gray' },
] as const

// Timeline Event Types
export const TIMELINE_EVENT_TYPES = [
  { value: 'admission', label: 'Admission' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'medication', label: 'Medication Administration' },
  { value: 'vital_signs', label: 'Vital Signs' },
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'imaging', label: 'Imaging Study' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'nursing_note', label: 'Nursing Note' },
  { value: 'physician_note', label: 'Physician Note' },
  { value: 'anesthesia_start', label: 'Anesthesia Start' },
  { value: 'anesthesia_end', label: 'Anesthesia End' },
  { value: 'intubation', label: 'Intubation' },
  { value: 'extubation', label: 'Extubation' },
  { value: 'complication', label: 'Complication' },
  { value: 'code_event', label: 'Code Event' },
  { value: 'death', label: 'Death' },
  { value: 'other', label: 'Other' },
] as const

// Patient Outcomes
export const PATIENT_OUTCOMES = [
  { value: 'full_recovery', label: 'Full Recovery' },
  { value: 'partial_recovery', label: 'Partial Recovery' },
  { value: 'permanent_injury', label: 'Permanent Injury' },
  { value: 'disability', label: 'Disability' },
  { value: 'death', label: 'Death' },
  { value: 'unknown', label: 'Unknown' },
] as const

// Note Types
export const NOTE_TYPES = [
  { value: 'general', label: 'General Note' },
  { value: 'clinical', label: 'Clinical Observation' },
  { value: 'legal', label: 'Legal Note' },
  { value: 'research', label: 'Research Note' },
  { value: 'strategy', label: 'Strategy Note' },
  { value: 'phone_call', label: 'Phone Call Note' },
  { value: 'meeting', label: 'Meeting Note' },
  { value: 'reminder', label: 'Reminder' },
] as const

// Milestone Types
export const MILESTONE_TYPES = [
  { value: 'records_received', label: 'Records Received' },
  { value: 'review_complete', label: 'Review Complete' },
  { value: 'opinion_formed', label: 'Opinion Formed' },
  { value: 'report_drafted', label: 'Report Drafted' },
  { value: 'report_finalized', label: 'Report Finalized' },
  { value: 'deposition_scheduled', label: 'Deposition Scheduled' },
  { value: 'deposition_complete', label: 'Deposition Complete' },
  { value: 'trial_scheduled', label: 'Trial Scheduled' },
  { value: 'trial_complete', label: 'Trial Complete' },
  { value: 'invoice_sent', label: 'Invoice Sent' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'case_closed', label: 'Case Closed' },
  { value: 'other', label: 'Other' },
] as const

// Contract Types
export const CONTRACT_TYPES = [
  { value: 'retention_agreement', label: 'Retention Agreement' },
  { value: 'engagement_letter', label: 'Engagement Letter' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'other', label: 'Other' },
] as const

// Contract Statuses
export const CONTRACT_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'review', label: 'Under Review', color: 'yellow' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'signed', label: 'Signed', color: 'green' },
  { value: 'expired', label: 'Expired', color: 'orange' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const

// Meeting Types
export const MEETING_TYPES = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'deposition_prep', label: 'Deposition Prep' },
  { value: 'conference', label: 'Conference' },
  { value: 'client_call', label: 'Client Call' },
  { value: 'expert_conference', label: 'Expert Conference' },
] as const

// Transcript Statuses
export const TRANSCRIPT_STATUSES = [
  { value: 'none', label: 'No Transcript', color: 'gray' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'processing', label: 'Processing', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
] as const

// Helper Functions
type ItemWithLabel = { value: string; label: string }
type ItemWithColor = { value: string; label: string; color: string }

export function getLabelForValue(
  items: readonly ItemWithLabel[],
  value: string
): string {
  const item = items.find((i) => i.value === value)
  return item?.label ?? value
}

export function getColorForValue(
  items: readonly ItemWithColor[],
  value: string
): string {
  const item = items.find((i) => i.value === value)
  return (item as ItemWithColor | undefined)?.color ?? 'gray'
}
