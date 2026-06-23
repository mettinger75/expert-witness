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
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'referral_agency', label: 'Referral Agency' },
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
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'physician_notes', label: 'Physician Notes' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'pleading', label: 'Pleading' },
  { value: 'legal_filing', label: 'Legal Filing' },
  { value: 'deposition_transcript', label: 'Deposition Transcript' },
  { value: 'expert_report', label: 'Expert Report' },
  { value: 'opposing_expert_report', label: 'Opposing Expert Report' },
  { value: 'literature', label: 'Medical Literature' },
  { value: 'guideline', label: 'Clinical Guideline' },
  { value: 'billing_record', label: 'Billing Record' },
  { value: 'insurance_document', label: 'Insurance Document' },
  { value: 'consent_form', label: 'Consent Form' },
  { value: 'autopsy', label: 'Autopsy Report' },
  { value: 'photograph', label: 'Photograph' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other' },
] as const

/** Document sub-tab groupings for the unified Documents page */
export const DOCUMENT_SUB_TABS = [
  {
    key: 'all',
    label: 'All Documents',
    categories: [] as string[],
  },
  {
    key: 'medical',
    label: 'Medical Records',
    categories: [
      'medical_record', 'operative_report', 'nursing_notes',
      'lab_results', 'imaging', 'pharmacy', 'discharge_summary', 'physician_notes',
      'autopsy', 'consent_form',
    ],
  },
  {
    key: 'anesthesia',
    label: 'Anesthesia Records',
    categories: ['anesthesia_record'],
    customView: true,
  },
  {
    key: 'depositions',
    label: 'Depositions',
    categories: ['deposition_transcript'],
  },
  {
    key: 'expert',
    label: 'Expert Reports',
    categories: ['expert_report', 'opposing_expert_report'],
  },
  {
    key: 'legal',
    label: 'Legal Filings',
    categories: ['pleading', 'legal_filing'],
  },
  {
    key: 'correspondence',
    label: 'Correspondence',
    categories: ['correspondence'],
  },
  {
    key: 'research',
    label: 'Research & Literature',
    categories: ['literature', 'guideline'],
  },
  {
    key: 'other',
    label: 'Other',
    categories: ['billing_record', 'insurance_document', 'photograph', 'video', 'audio', 'other'],
  },
] as const

// Activity Types
export const ACTIVITY_TYPES = [
  { value: 'record_review', label: 'Record Review' },
  { value: 'file_review', label: 'File Review' },
  { value: 'research', label: 'Research' },
  { value: 'report_writing', label: 'Report Writing' },
  { value: 'deposition_prep', label: 'Deposition Preparation' },
  { value: 'deposition_testimony', label: 'Deposition Testimony' },
  { value: 'trial_prep', label: 'Trial Preparation' },
  { value: 'trial_testimony', label: 'Trial Testimony' },
  { value: 'phone_conference', label: 'Phone Conference' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'court_appearance', label: 'Court Appearance' },
  { value: 'correspondence', label: 'Correspondence' },
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

// Charge Types (non-time line item types)
export const CHARGE_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'flat_fee', label: 'Flat Fee' },
  { value: 'retainer_application', label: 'Retainer Application' },
  { value: 'adjustment', label: 'Adjustment' },
] as const

// Timeline Event Types
export const TIMELINE_EVENT_TYPES = [
  { value: 'admission', label: 'Admission' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'medication_start', label: 'Medication Start' },
  { value: 'medication_stop', label: 'Medication Stop' },
  { value: 'medication_change', label: 'Medication Change' },
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'imaging', label: 'Imaging Study' },
  { value: 'vital_signs', label: 'Vital Signs' },
  { value: 'nursing_note', label: 'Nursing Note' },
  { value: 'physician_note', label: 'Physician Note' },
  { value: 'anesthesia_event', label: 'Anesthesia Event' },
  { value: 'complication', label: 'Complication' },
  { value: 'code_event', label: 'Code Event' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'death', label: 'Death' },
  { value: 'office_visit', label: 'Office Visit' },
  { value: 'er_visit', label: 'ER Visit' },
  { value: 'icu_admission', label: 'ICU Admission' },
  { value: 'icu_discharge', label: 'ICU Discharge' },
  { value: 'intubation', label: 'Intubation' },
  { value: 'extubation', label: 'Extubation' },
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

// =============================================================================
// Configurable Options Infrastructure
// =============================================================================

/** Shape of each option item stored in system_settings */
export interface OptionItem {
  value: string
  label: string
  color?: string
  is_active: boolean
  sort_order: number
}

/** All configurable option keys */
export const OPTION_KEYS = {
  CASE_STATUSES: 'options.case_statuses',
  CASE_TYPES: 'options.case_types',
  CASE_PRIORITIES: 'options.case_priorities',
  SPECIALTY_AREAS: 'options.specialty_areas',
  PATIENT_OUTCOMES: 'options.patient_outcomes',
  CONTACT_TYPES: 'options.contact_types',
  CASE_CONTACT_ROLES: 'options.case_contact_roles',
  DOCUMENT_CATEGORIES: 'options.document_categories',
  TIMELINE_EVENT_TYPES: 'options.timeline_event_types',
  NOTE_TYPES: 'options.note_types',
  MILESTONE_TYPES: 'options.milestone_types',
  ACTIVITY_TYPES: 'options.activity_types',
  CHARGE_TYPES: 'options.charge_types',
  INVOICE_STATUSES: 'options.invoice_statuses',
  REPORT_TYPES: 'options.report_types',
  CONTRACT_TYPES: 'options.contract_types',
  CONTRACT_STATUSES: 'options.contract_statuses',
  MEETING_TYPES: 'options.meeting_types',
  TRANSCRIPT_STATUSES: 'options.transcript_statuses',
  DASHBOARD_LAYOUT: 'dashboard.layout',
} as const

/** Convert a readonly const array to OptionItem[] for defaults */
function toOptionItems(
  items: readonly { value: string; label: string; color?: string }[]
): OptionItem[] {
  return items.map((item, i) => ({
    value: item.value,
    label: item.label,
    color: (item as { color?: string }).color,
    is_active: true,
    sort_order: i,
  }))
}

/** Default option values (hardcoded fallback when DB is unavailable) */
export const OPTION_DEFAULTS: Record<string, OptionItem[]> = {
  [OPTION_KEYS.CASE_STATUSES]: toOptionItems(CASE_STATUSES),
  [OPTION_KEYS.CASE_TYPES]: toOptionItems(CASE_TYPES),
  [OPTION_KEYS.CASE_PRIORITIES]: toOptionItems(CASE_PRIORITIES),
  [OPTION_KEYS.SPECIALTY_AREAS]: toOptionItems(SPECIALTY_AREAS),
  [OPTION_KEYS.PATIENT_OUTCOMES]: toOptionItems(PATIENT_OUTCOMES),
  [OPTION_KEYS.CONTACT_TYPES]: toOptionItems(CONTACT_TYPES),
  [OPTION_KEYS.CASE_CONTACT_ROLES]: toOptionItems(CASE_CONTACT_ROLES),
  [OPTION_KEYS.DOCUMENT_CATEGORIES]: toOptionItems(DOCUMENT_CATEGORIES),
  [OPTION_KEYS.TIMELINE_EVENT_TYPES]: toOptionItems(TIMELINE_EVENT_TYPES),
  [OPTION_KEYS.NOTE_TYPES]: toOptionItems(NOTE_TYPES),
  [OPTION_KEYS.MILESTONE_TYPES]: toOptionItems(MILESTONE_TYPES),
  [OPTION_KEYS.ACTIVITY_TYPES]: toOptionItems(ACTIVITY_TYPES),
  [OPTION_KEYS.CHARGE_TYPES]: toOptionItems(CHARGE_TYPES),
  [OPTION_KEYS.INVOICE_STATUSES]: toOptionItems(INVOICE_STATUSES),
  [OPTION_KEYS.REPORT_TYPES]: toOptionItems(REPORT_TYPES),
  [OPTION_KEYS.CONTRACT_TYPES]: toOptionItems(CONTRACT_TYPES),
  [OPTION_KEYS.CONTRACT_STATUSES]: toOptionItems(CONTRACT_STATUSES),
  [OPTION_KEYS.MEETING_TYPES]: toOptionItems(MEETING_TYPES),
  [OPTION_KEYS.TRANSCRIPT_STATUSES]: toOptionItems(TRANSCRIPT_STATUSES),
}

/** Map from option key (without 'options.' prefix) to DB constraint info */
export const CONSTRAINT_MAP: Record<
  string,
  Array<{ table: string; column: string; constraint: string }>
> = {
  case_statuses: [
    { table: 'cases', column: 'status', constraint: 'cases_status_check' },
  ],
  case_types: [
    { table: 'cases', column: 'case_type', constraint: 'cases_case_type_check' },
  ],
  case_priorities: [
    { table: 'cases', column: 'priority', constraint: 'cases_priority_check' },
  ],
  specialty_areas: [
    { table: 'cases', column: 'specialty_area', constraint: 'cases_specialty_area_check' },
  ],
  patient_outcomes: [
    { table: 'cases', column: 'patient_outcome', constraint: 'cases_patient_outcome_check' },
  ],
  contact_types: [
    { table: 'contacts', column: 'contact_type', constraint: 'contacts_contact_type_check' },
  ],
  case_contact_roles: [
    { table: 'case_contacts', column: 'role', constraint: 'case_contacts_role_check' },
  ],
  document_categories: [
    { table: 'documents', column: 'document_type', constraint: 'documents_document_type_check' },
  ],
  timeline_event_types: [
    { table: 'medical_records_timeline', column: 'event_type', constraint: 'medical_records_timeline_event_type_check' },
  ],
  note_types: [
    { table: 'case_notes', column: 'note_type', constraint: 'case_notes_note_type_check' },
  ],
  milestone_types: [
    { table: 'case_milestones', column: 'milestone_type', constraint: 'case_milestones_milestone_type_check' },
  ],
  activity_types: [
    { table: 'time_entries', column: 'activity_type', constraint: 'time_entries_activity_type_check' },
    { table: 'billing_rates', column: 'activity_type', constraint: 'billing_rates_activity_type_check' },
  ],
  invoice_statuses: [
    { table: 'invoices', column: 'status', constraint: 'invoices_status_check' },
  ],
  report_types: [
    { table: 'reports', column: 'report_type', constraint: 'reports_report_type_check' },
    { table: 'report_templates', column: 'template_type', constraint: 'report_templates_template_type_check' },
  ],
  contract_types: [
    { table: 'contracts', column: 'contract_type', constraint: 'contracts_type_check' },
  ],
  contract_statuses: [
    { table: 'contracts', column: 'status', constraint: 'contracts_status_check' },
  ],
  meeting_types: [
    { table: 'meetings', column: 'meeting_type', constraint: 'meetings_meeting_type_check' },
  ],
  transcript_statuses: [
    { table: 'meetings', column: 'transcript_status', constraint: 'meetings_transcript_status_check' },
  ],
}

/** Available StatusBadge colors for option editing */
export const BADGE_COLORS = [
  'slate', 'gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
] as const
