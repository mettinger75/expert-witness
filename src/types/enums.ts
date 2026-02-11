// =============================================================================
// Expert Witness Practice Management System
// Enum / Union Types
// =============================================================================

// ---------------------------------------------------------------------------
// Case enums
// ---------------------------------------------------------------------------

export type CaseType =
  | 'medical_malpractice'
  | 'personal_injury'
  | 'product_liability'
  | 'criminal'
  | 'peer_review'
  | 'licensing_board'
  | 'other';

export type SpecialtyArea =
  | 'general_anesthesia'
  | 'regional'
  | 'obstetric'
  | 'pediatric'
  | 'cardiac'
  | 'neuro'
  | 'pain_management'
  | 'critical_care'
  | 'other';

export type CaseSide =
  | 'plaintiff'
  | 'defense'
  | 'neutral';

export type CaseStatus =
  | 'inquiry'
  | 'conflict_check'
  | 'accepted'
  | 'active'
  | 'opinion_issued'
  | 'deposition_scheduled'
  | 'deposition_complete'
  | 'trial_scheduled'
  | 'trial_complete'
  | 'closed'
  | 'declined'
  | 'withdrawn';

export type CasePriority =
  | 'urgent'
  | 'high'
  | 'normal'
  | 'low';

export type PatientOutcome =
  | 'death'
  | 'permanent_injury'
  | 'temporary_injury'
  | 'no_injury'
  | 'unknown';

export type PreliminaryOpinion =
  | 'supportive'
  | 'non_supportive'
  | 'mixed'
  | 'insufficient_records'
  | 'pending';

// ---------------------------------------------------------------------------
// Contact enums
// ---------------------------------------------------------------------------

export type ContactType =
  | 'attorney'
  | 'law_firm'
  | 'paralegal'
  | 'expert'
  | 'medical_provider'
  | 'insurance'
  | 'court'
  | 'physician'
  | 'nurse'
  | 'patient'
  | 'other';

export type CaseContactRole =
  | 'retaining_attorney'
  | 'opposing_attorney'
  | 'co_counsel'
  | 'paralegal'
  | 'defendant_provider'
  | 'plaintiff_patient'
  | 'insurance_adjuster'
  | 'other_expert'
  | 'court_reporter'
  | 'videographer'
  | 'other';

export type PreferredCommunication =
  | 'email'
  | 'phone'
  | 'fax';

// ---------------------------------------------------------------------------
// Document enums
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | 'medical_records'
  | 'billing_records'
  | 'imaging_studies'
  | 'lab_results'
  | 'operative_reports'
  | 'anesthesia_records'
  | 'nursing_notes'
  | 'physician_notes'
  | 'discharge_summary'
  | 'autopsy_report'
  | 'deposition_transcript'
  | 'deposition_exhibit'
  | 'trial_transcript'
  | 'trial_exhibit'
  | 'pleading'
  | 'discovery_request'
  | 'discovery_response'
  | 'expert_report'
  | 'expert_cv'
  | 'correspondence'
  | 'medical_literature'
  | 'guidelines_standards'
  | 'policies_procedures'
  | 'photo_video'
  | 'other';

export type ReviewStatus =
  | 'not_started'
  | 'in_progress'
  | 'reviewed'
  | 'flagged'
  | 'needs_re_review';

export type ReviewPriority =
  | 'critical'
  | 'high'
  | 'normal'
  | 'low';

export type OcrStatus =
  | 'not_needed'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type AnnotationType =
  | 'highlight'
  | 'note'
  | 'bookmark'
  | 'redaction'
  | 'stamp';

// ---------------------------------------------------------------------------
// Medical timeline enums
// ---------------------------------------------------------------------------

export type TimelineEventType =
  | 'admission'
  | 'discharge'
  | 'surgery'
  | 'procedure'
  | 'anesthesia_start'
  | 'anesthesia_end'
  | 'medication_given'
  | 'vital_signs'
  | 'lab_result'
  | 'imaging'
  | 'consultation'
  | 'nursing_assessment'
  | 'physician_note'
  | 'code_event'
  | 'complication'
  | 'death'
  | 'other';

// ---------------------------------------------------------------------------
// Deposition enums
// ---------------------------------------------------------------------------

export type DeponentRole =
  | 'plaintiff'
  | 'defendant'
  | 'expert_witness'
  | 'treating_physician'
  | 'nurse'
  | 'first_responder'
  | 'fact_witness'
  | 'corporate_representative'
  | 'other';

export type ExcerptCategory =
  | 'admission'
  | 'denial'
  | 'explanation'
  | 'timeline'
  | 'standard_of_care'
  | 'causation'
  | 'damages'
  | 'impeachment'
  | 'background'
  | 'other';

// ---------------------------------------------------------------------------
// Report enums
// ---------------------------------------------------------------------------

export type ReportType =
  | 'preliminary_review'
  | 'initial_opinion_letter'
  | 'expert_report'
  | 'expert_report_plaintiff'
  | 'expert_report_defense'
  | 'rebuttal_report'
  | 'supplemental_report'
  | 'affidavit'
  | 'declaration'
  | 'case_summary'
  | 'medical_chronology'
  | 'standard_of_care_analysis'
  | 'causation_analysis'
  | 'damages_analysis'
  | 'deposition_prep'
  | 'trial_prep'
  | 'letter'
  | 'custom';

export type ReportStatus =
  | 'draft'
  | 'in_progress'
  | 'ai_generating'
  | 'review'
  | 'revision'
  | 'final'
  | 'sent'
  | 'superseded';

export type GenerationStyle =
  | 'formal'
  | 'conversational'
  | 'technical';

export type GenerationLength =
  | 'brief'
  | 'standard'
  | 'comprehensive';

export type GenerationTone =
  | 'objective'
  | 'advocacy_plaintiff'
  | 'advocacy_defense';

export type QueueStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// ---------------------------------------------------------------------------
// AI / conversation enums
// ---------------------------------------------------------------------------

export type ConversationType =
  | 'general'
  | 'case_analysis'
  | 'document_review'
  | 'report_drafting'
  | 'deposition_prep'
  | 'research'
  | 'timeline_review'
  | 'standard_of_care'
  | 'causation_analysis'
  | 'template';

export type MessageRole =
  | 'system'
  | 'user'
  | 'assistant'
  | 'tool';

export type AITaskType =
  | 'document_ocr'
  | 'document_summarize'
  | 'document_extract_timeline'
  | 'document_extract_medications'
  | 'document_extract_vitals'
  | 'document_classify'
  | 'case_summarize'
  | 'case_identify_issues'
  | 'timeline_generate'
  | 'deposition_summarize'
  | 'deposition_extract_key_testimony'
  | 'report_section_generate'
  | 'report_full_generate'
  | 'research_medical_literature'
  | 'research_standards_guidelines'
  | 'custom';

export type PromptCategory =
  | 'document_analysis'
  | 'case_analysis'
  | 'report_generation'
  | 'research'
  | 'deposition'
  | 'trial'
  | 'general'
  | 'custom';

// ---------------------------------------------------------------------------
// Billing / time enums
// ---------------------------------------------------------------------------

export type ActivityType =
  | 'record_review'
  | 'file_review'
  | 'research'
  | 'report_writing'
  | 'deposition_prep'
  | 'deposition_testimony'
  | 'trial_prep'
  | 'trial_testimony'
  | 'phone_conference'
  | 'consultation'
  | 'court_appearance'
  | 'correspondence'
  | 'travel'
  | 'administrative'
  | 'other';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'written_off'
  | 'disputed';

export type LineItemType =
  | 'time'
  | 'expense'
  | 'retainer_application'
  | 'flat_fee'
  | 'adjustment';

export type PaymentMethod =
  | 'check'
  | 'wire'
  | 'ach'
  | 'credit_card'
  | 'other';

export type PaymentType =
  | 'retainer'
  | 'invoice_payment'
  | 'advance';

// ---------------------------------------------------------------------------
// Communication / log enums
// ---------------------------------------------------------------------------

export type CommunicationType =
  | 'phone_inbound'
  | 'phone_outbound'
  | 'email_inbound'
  | 'email_outbound'
  | 'video_call'
  | 'in_person'
  | 'letter'
  | 'fax'
  | 'text'
  | 'voicemail'
  | 'other';

// ---------------------------------------------------------------------------
// Case milestone / note enums
// ---------------------------------------------------------------------------

export type MilestoneType =
  | 'records_received'
  | 'records_complete'
  | 'retainer_received'
  | 'review_complete'
  | 'report_drafted'
  | 'report_submitted'
  | 'deposition_notice'
  | 'deposition_completed'
  | 'trial_date_set'
  | 'trial_completed'
  | 'case_resolved'
  | 'payment_received'
  | 'custom';

export type NoteType =
  | 'general'
  | 'medical_analysis'
  | 'legal_issue'
  | 'strategy'
  | 'question'
  | 'to_do'
  | 'important';

// ---------------------------------------------------------------------------
// Conflict check enums
// ---------------------------------------------------------------------------

export type ConflictResolution =
  | 'cleared'
  | 'waived'
  | 'declined'
  | 'pending';

// ---------------------------------------------------------------------------
// Audit enums
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'ai_generate';

// ---------------------------------------------------------------------------
// Meeting enums
// ---------------------------------------------------------------------------

export type MeetingType =
  | 'phone_call'
  | 'video_call'
  | 'in_person'
  | 'deposition_prep'
  | 'conference'
  | 'client_call'
  | 'expert_conference';

export type TranscriptStatus =
  | 'none'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

// ---------------------------------------------------------------------------
// Contract enums
// ---------------------------------------------------------------------------

export type ContractType =
  | 'retention_agreement'
  | 'engagement_letter'
  | 'amendment'
  | 'other';

export type ContractStatus =
  | 'draft'
  | 'review'
  | 'sent'
  | 'signed'
  | 'expired'
  | 'cancelled';
