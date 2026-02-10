// =============================================================================
// Expert Witness Practice Management System
// Database Types -- Row, Insert, Update for all 31 tables
// =============================================================================

import type {
  CaseType,
  SpecialtyArea,
  CaseSide,
  CaseStatus,
  CasePriority,
  PatientOutcome,
  PreliminaryOpinion,
  ContactType,
  CaseContactRole,
  PreferredCommunication,
  DocumentCategory,
  ReviewStatus,
  ReviewPriority,
  OcrStatus,
  AnnotationType,
  TimelineEventType,
  DeponentRole,
  ExcerptCategory,
  ReportType,
  ReportStatus,
  QueueStatus,
  ConversationType,
  MessageRole,
  AITaskType,
  PromptCategory,
  ActivityType,
  InvoiceStatus,
  LineItemType,
  PaymentMethod,
  PaymentType,
  CommunicationType,
  MilestoneType,
  NoteType,
  ConflictResolution,
  AuditAction,
  MeetingType,
  TranscriptStatus,
} from './enums';

// Re-export all enums so consumers can import from a single place if desired
export type * from './enums';

// =============================================================================
// JSON helper – Supabase stores arbitrary JSON in `jsonb` columns
// =============================================================================
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// =============================================================================
// 1. cases
// =============================================================================
export interface CaseRow {
  id: string;
  case_number: string;
  case_name: string;
  case_type: CaseType;
  specialty_area: SpecialtyArea | null;
  side: CaseSide;
  status: CaseStatus;
  priority: CasePriority;
  jurisdiction_state: string | null;
  jurisdiction_county: string | null;
  court_name: string | null;
  court_case_number: string | null;
  date_of_incident: string | null;
  date_of_referral: string;
  statute_of_limitations: string | null;
  patient_name: string | null;
  patient_dob: string | null;
  patient_age_at_incident: number | null;
  patient_outcome: PatientOutcome | null;
  brief_summary: string | null;
  key_issues: string[] | null;
  preliminary_opinion: PreliminaryOpinion;
  opinion_summary: string | null;
  standard_of_care_issues: string[] | null;
  causation_notes: string | null;
  damages_summary: string | null;
  retainer_amount: number | null;
  retainer_received: boolean;
  retainer_date: string | null;
  total_billed: number;
  total_paid: number;
  outstanding_balance: number;
  estimated_hours: number | null;
  actual_hours: number;
  deadline_next: string | null;
  deadline_description: string | null;
  notion_page_url: string | null;
  notion_page_id: string | null;
  notion_last_synced: string | null;
  tags: string[] | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseInsert {
  id?: string;
  case_number: string;
  case_name: string;
  case_type: CaseType;
  specialty_area?: SpecialtyArea | null;
  side: CaseSide;
  status?: CaseStatus;
  priority?: CasePriority;
  jurisdiction_state?: string | null;
  jurisdiction_county?: string | null;
  court_name?: string | null;
  court_case_number?: string | null;
  date_of_incident?: string | null;
  date_of_referral?: string;
  statute_of_limitations?: string | null;
  patient_name?: string | null;
  patient_dob?: string | null;
  patient_age_at_incident?: number | null;
  patient_outcome?: PatientOutcome | null;
  brief_summary?: string | null;
  key_issues?: string[] | null;
  preliminary_opinion?: PreliminaryOpinion;
  opinion_summary?: string | null;
  standard_of_care_issues?: string[] | null;
  causation_notes?: string | null;
  damages_summary?: string | null;
  retainer_amount?: number | null;
  retainer_received?: boolean;
  retainer_date?: string | null;
  total_billed?: number;
  total_paid?: number;
  outstanding_balance?: number;
  estimated_hours?: number | null;
  actual_hours?: number;
  deadline_next?: string | null;
  deadline_description?: string | null;
  notion_page_url?: string | null;
  notion_page_id?: string | null;
  notion_last_synced?: string | null;
  tags?: string[] | null;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CaseUpdate = Partial<CaseInsert>;

// =============================================================================
// 2. contacts
// =============================================================================
export interface ContactRow {
  id: string;
  contact_type: ContactType;
  first_name: string;
  last_name: string;
  title: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  phone_alt: string | null;
  fax: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  preferred_communication: PreferredCommunication;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactInsert {
  id?: string;
  contact_type: ContactType;
  first_name: string;
  last_name: string;
  title?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_alt?: string | null;
  fax?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  preferred_communication?: PreferredCommunication;
  notes?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ContactUpdate = Partial<ContactInsert>;

// =============================================================================
// 3. case_contacts
// =============================================================================
export interface CaseContactRow {
  id: string;
  case_id: string;
  contact_id: string;
  role: CaseContactRole;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export interface CaseContactInsert {
  id?: string;
  case_id: string;
  contact_id: string;
  role: CaseContactRole;
  is_primary?: boolean;
  notes?: string | null;
  created_at?: string;
}

export type CaseContactUpdate = Partial<CaseContactInsert>;

// =============================================================================
// 4. documents
// =============================================================================
export interface DocumentRow {
  id: string;
  case_id: string;
  folder_id: string | null;
  file_name: string;
  original_file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: DocumentCategory;
  description: string | null;
  source_provider: string | null;
  date_of_document: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  bates_start: string | null;
  bates_end: string | null;
  page_count: number | null;
  review_status: ReviewStatus;
  review_priority: ReviewPriority;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  ocr_status: OcrStatus;
  ocr_text: string | null;
  ai_summary: string | null;
  ai_key_findings: string[] | null;
  ai_extracted_dates: Json | null;
  ai_extracted_medications: Json | null;
  ai_extracted_providers: string[] | null;
  tags: string[] | null;
  is_exhibit: boolean;
  exhibit_number: string | null;
  is_privileged: boolean;
  privilege_description: string | null;
  report_id: string | null;
  version: number;
  parent_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentInsert {
  id?: string;
  case_id: string;
  folder_id?: string | null;
  file_name: string;
  original_file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category?: DocumentCategory;
  description?: string | null;
  source_provider?: string | null;
  date_of_document?: string | null;
  date_range_start?: string | null;
  date_range_end?: string | null;
  bates_start?: string | null;
  bates_end?: string | null;
  page_count?: number | null;
  review_status?: ReviewStatus;
  review_priority?: ReviewPriority;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  ocr_status?: OcrStatus;
  ocr_text?: string | null;
  ai_summary?: string | null;
  ai_key_findings?: string[] | null;
  ai_extracted_dates?: Json | null;
  ai_extracted_medications?: Json | null;
  ai_extracted_providers?: string[] | null;
  tags?: string[] | null;
  is_exhibit?: boolean;
  exhibit_number?: string | null;
  is_privileged?: boolean;
  privilege_description?: string | null;
  report_id?: string | null;
  version?: number;
  parent_document_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type DocumentUpdate = Partial<DocumentInsert>;

// =============================================================================
// 5. document_folders
// =============================================================================
export interface DocumentFolderRow {
  id: string;
  case_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentFolderInsert {
  id?: string;
  case_id: string;
  parent_folder_id?: string | null;
  name: string;
  description?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export type DocumentFolderUpdate = Partial<DocumentFolderInsert>;

// =============================================================================
// 6. document_annotations
// =============================================================================
export interface DocumentAnnotationRow {
  id: string;
  document_id: string;
  annotation_type: AnnotationType;
  page_number: number;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  content: string | null;
  color: string | null;
  selected_text: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentAnnotationInsert {
  id?: string;
  document_id: string;
  annotation_type: AnnotationType;
  page_number: number;
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  content?: string | null;
  color?: string | null;
  selected_text?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export type DocumentAnnotationUpdate = Partial<DocumentAnnotationInsert>;

// =============================================================================
// 7. medical_records_timeline
// =============================================================================
export interface MedicalRecordsTimelineRow {
  id: string;
  case_id: string;
  document_id: string | null;
  event_type: TimelineEventType;
  event_datetime: string;
  event_end_datetime: string | null;
  title: string;
  description: string | null;
  provider_name: string | null;
  provider_role: string | null;
  facility: string | null;
  details: Json | null;
  vital_signs: Json | null;
  medications: Json | null;
  lab_values: Json | null;
  is_significant: boolean;
  significance_note: string | null;
  page_reference: string | null;
  ai_generated: boolean;
  ai_confidence: number | null;
  verified: boolean;
  verified_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecordsTimelineInsert {
  id?: string;
  case_id: string;
  document_id?: string | null;
  event_type: TimelineEventType;
  event_datetime: string;
  event_end_datetime?: string | null;
  title: string;
  description?: string | null;
  provider_name?: string | null;
  provider_role?: string | null;
  facility?: string | null;
  details?: Json | null;
  vital_signs?: Json | null;
  medications?: Json | null;
  lab_values?: Json | null;
  is_significant?: boolean;
  significance_note?: string | null;
  page_reference?: string | null;
  ai_generated?: boolean;
  ai_confidence?: number | null;
  verified?: boolean;
  verified_at?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export type MedicalRecordsTimelineUpdate = Partial<MedicalRecordsTimelineInsert>;

// =============================================================================
// 8. depositions
// =============================================================================
export interface DepositionRow {
  id: string;
  case_id: string;
  deponent_name: string;
  deponent_role: DeponentRole;
  deponent_title: string | null;
  deponent_organization: string | null;
  deposition_date: string;
  deposition_location: string | null;
  is_video_recorded: boolean;
  court_reporter_contact_id: string | null;
  videographer_contact_id: string | null;
  transcript_document_id: string | null;
  duration_hours: number | null;
  status: string;
  preparation_notes: string | null;
  summary: string | null;
  ai_summary: string | null;
  key_admissions: string[] | null;
  key_denials: string[] | null;
  credibility_notes: string | null;
  follow_up_needed: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DepositionInsert {
  id?: string;
  case_id: string;
  deponent_name: string;
  deponent_role: DeponentRole;
  deponent_title?: string | null;
  deponent_organization?: string | null;
  deposition_date: string;
  deposition_location?: string | null;
  is_video_recorded?: boolean;
  court_reporter_contact_id?: string | null;
  videographer_contact_id?: string | null;
  transcript_document_id?: string | null;
  duration_hours?: number | null;
  status?: string;
  preparation_notes?: string | null;
  summary?: string | null;
  ai_summary?: string | null;
  key_admissions?: string[] | null;
  key_denials?: string[] | null;
  credibility_notes?: string | null;
  follow_up_needed?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export type DepositionUpdate = Partial<DepositionInsert>;

// =============================================================================
// 9. deposition_excerpts
// =============================================================================
export interface DepositionExcerptRow {
  id: string;
  deposition_id: string;
  page_line_start: string;
  page_line_end: string;
  excerpt_text: string;
  category: ExcerptCategory;
  summary: string | null;
  significance: string | null;
  related_issues: string[] | null;
  tags: string[] | null;
  is_impeachment_material: boolean;
  ai_generated: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DepositionExcerptInsert {
  id?: string;
  deposition_id: string;
  page_line_start: string;
  page_line_end: string;
  excerpt_text: string;
  category?: ExcerptCategory;
  summary?: string | null;
  significance?: string | null;
  related_issues?: string[] | null;
  tags?: string[] | null;
  is_impeachment_material?: boolean;
  ai_generated?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export type DepositionExcerptUpdate = Partial<DepositionExcerptInsert>;

// =============================================================================
// 10. report_templates
// =============================================================================
export interface ReportTemplateRow {
  id: string;
  template_name: string;
  template_type: string;
  description: string | null;
  category: string | null;
  header_content: string | null;
  footer_content: string | null;
  default_content_template: string | null;
  css_styles: string | null;
  page_format: Json | null;
  variables: Json | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplateInsert {
  id?: string;
  template_name: string;
  template_type: string;
  description?: string | null;
  category?: string | null;
  header_content?: string | null;
  footer_content?: string | null;
  default_content_template?: string | null;
  css_styles?: string | null;
  page_format?: Json | null;
  variables?: Json | null;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export type ReportTemplateUpdate = Partial<ReportTemplateInsert>;

// =============================================================================
// 11. template_sections
// =============================================================================
export interface TemplateSectionRow {
  id: string;
  section_name: string;
  section_key: string;
  description: string | null;
  default_content: string | null;
  is_required: boolean;
  is_ai_generated: boolean;
  ai_prompt: string | null;
  data_source: string | null;
  content_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateSectionInsert {
  id?: string;
  section_name: string;
  section_key: string;
  description?: string | null;
  default_content?: string | null;
  is_required?: boolean;
  is_ai_generated?: boolean;
  ai_prompt?: string | null;
  data_source?: string | null;
  content_type: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TemplateSectionUpdate = Partial<TemplateSectionInsert>;

// =============================================================================
// 12. template_section_mappings
// =============================================================================
export interface TemplateSectionMappingRow {
  id: string;
  template_id: string;
  section_id: string;
  sort_order: number;
  is_included: boolean;
  override_content: string | null;
  override_prompt: string | null;
  created_at: string;
}

export interface TemplateSectionMappingInsert {
  id?: string;
  template_id: string;
  section_id: string;
  sort_order?: number;
  is_included?: boolean;
  override_content?: string | null;
  override_prompt?: string | null;
  created_at?: string;
}

export type TemplateSectionMappingUpdate = Partial<TemplateSectionMappingInsert>;

// =============================================================================
// 13. reports
// =============================================================================
export interface ReportRow {
  id: string;
  case_id: string;
  template_id: string | null;
  report_name: string;
  report_type: ReportType;
  report_number: string | null;
  status: ReportStatus;
  content: Json | null;
  sections_data: Json | null;
  rendered_html: string | null;
  rendered_text: string | null;
  version: number;
  parent_report_id: string | null;
  is_latest_version: boolean;
  change_notes: string | null;
  output_document_id: string | null;
  output_format: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  approved_at: string | null;
  sent_at: string | null;
  sent_to: string[] | null;
  sent_method: string | null;
  ai_generated_sections: string[] | null;
  ai_generation_metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface ReportInsert {
  id?: string;
  case_id: string;
  template_id?: string | null;
  report_name: string;
  report_type: ReportType;
  report_number?: string | null;
  status?: ReportStatus;
  content?: Json | null;
  sections_data?: Json | null;
  rendered_html?: string | null;
  rendered_text?: string | null;
  version?: number;
  parent_report_id?: string | null;
  is_latest_version?: boolean;
  change_notes?: string | null;
  output_document_id?: string | null;
  output_format?: string | null;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  sent_to?: string[] | null;
  sent_method?: string | null;
  ai_generated_sections?: string[] | null;
  ai_generation_metadata?: Json | null;
  created_at?: string;
  updated_at?: string;
}

export type ReportUpdate = Partial<ReportInsert>;

// =============================================================================
// 14. report_generation_queue
// =============================================================================
export interface ReportGenerationQueueRow {
  id: string;
  report_id: string;
  section_id: string | null;
  status: QueueStatus;
  priority: number;
  prompt: string;
  context_data: Json | null;
  result_content: string | null;
  error_message: string | null;
  ai_model: string | null;
  tokens_used: number | null;
  processing_time_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ReportGenerationQueueInsert {
  id?: string;
  report_id: string;
  section_id?: string | null;
  status?: QueueStatus;
  priority?: number;
  prompt: string;
  context_data?: Json | null;
  result_content?: string | null;
  error_message?: string | null;
  ai_model?: string | null;
  tokens_used?: number | null;
  processing_time_ms?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export type ReportGenerationQueueUpdate = Partial<ReportGenerationQueueInsert>;

// =============================================================================
// 15. ai_conversations
// =============================================================================
export interface AIConversationRow {
  id: string;
  case_id: string | null;
  document_id: string | null;
  report_id: string | null;
  conversation_type: ConversationType;
  title: string;
  summary: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  message_count: number;
  last_message_at: string | null;
  model_used: string | null;
  total_tokens_used: number;
  created_at: string;
  updated_at: string;
}

export interface AIConversationInsert {
  id?: string;
  case_id?: string | null;
  document_id?: string | null;
  report_id?: string | null;
  conversation_type: ConversationType;
  title: string;
  summary?: string | null;
  is_pinned?: boolean;
  is_archived?: boolean;
  message_count?: number;
  last_message_at?: string | null;
  model_used?: string | null;
  total_tokens_used?: number;
  created_at?: string;
  updated_at?: string;
}

export type AIConversationUpdate = Partial<AIConversationInsert>;

// =============================================================================
// 16. ai_messages
// =============================================================================
export interface AIMessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: Json | null;
  tokens_used: number | null;
  model_used: string | null;
  rating: number | null;
  feedback: string | null;
  created_at: string;
}

export interface AIMessageInsert {
  id?: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: Json | null;
  tokens_used?: number | null;
  model_used?: string | null;
  rating?: number | null;
  feedback?: string | null;
  created_at?: string;
}

export type AIMessageUpdate = Partial<AIMessageInsert>;

// =============================================================================
// 17. ai_tasks
// =============================================================================
export interface AITaskRow {
  id: string;
  case_id: string | null;
  document_id: string | null;
  report_id: string | null;
  deposition_id: string | null;
  task_type: AITaskType;
  status: QueueStatus;
  priority: number;
  input_data: Json | null;
  prompt: string | null;
  result_data: Json | null;
  error_message: string | null;
  ai_model: string | null;
  tokens_used: number | null;
  processing_time_ms: number | null;
  retry_count: number;
  max_retries: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AITaskInsert {
  id?: string;
  case_id?: string | null;
  document_id?: string | null;
  report_id?: string | null;
  deposition_id?: string | null;
  task_type: AITaskType;
  status?: QueueStatus;
  priority?: number;
  input_data?: Json | null;
  prompt?: string | null;
  result_data?: Json | null;
  error_message?: string | null;
  ai_model?: string | null;
  tokens_used?: number | null;
  processing_time_ms?: number | null;
  retry_count?: number;
  max_retries?: number;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export type AITaskUpdate = Partial<AITaskInsert>;

// =============================================================================
// 18. ai_prompts_library
// =============================================================================
export interface AIPromptsLibraryRow {
  id: string;
  name: string;
  category: PromptCategory;
  description: string | null;
  prompt_template: string;
  system_instructions: string | null;
  required_variables: string[] | null;
  optional_variables: string[] | null;
  default_model: string | null;
  default_temperature: number | null;
  default_max_tokens: number | null;
  example_output: string | null;
  is_active: boolean;
  usage_count: number;
  avg_rating: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AIPromptsLibraryInsert {
  id?: string;
  name: string;
  category: PromptCategory;
  description?: string | null;
  prompt_template: string;
  system_instructions?: string | null;
  required_variables?: string[] | null;
  optional_variables?: string[] | null;
  default_model?: string | null;
  default_temperature?: number | null;
  default_max_tokens?: number | null;
  example_output?: string | null;
  is_active?: boolean;
  usage_count?: number;
  avg_rating?: number | null;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export type AIPromptsLibraryUpdate = Partial<AIPromptsLibraryInsert>;

// =============================================================================
// 19. ai_context_rules
// =============================================================================
export interface AIContextRuleRow {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: Json;
  context_instructions: string;
  applies_to_task_types: AITaskType[] | null;
  applies_to_case_types: CaseType[] | null;
  applies_to_report_types: ReportType[] | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIContextRuleInsert {
  id?: string;
  name: string;
  description?: string | null;
  rule_type: string;
  conditions: Json;
  context_instructions: string;
  applies_to_task_types?: AITaskType[] | null;
  applies_to_case_types?: CaseType[] | null;
  applies_to_report_types?: ReportType[] | null;
  priority?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type AIContextRuleUpdate = Partial<AIContextRuleInsert>;

// =============================================================================
// 20. time_entries
// =============================================================================
export interface TimeEntryRow {
  id: string;
  case_id: string;
  billing_rate_id: string | null;
  activity_type: ActivityType;
  description: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_hours: number;
  is_timer_entry: boolean;
  rate_per_hour: number;
  amount: number;
  is_billable: boolean;
  is_billed: boolean;
  invoice_id: string | null;
  status: string;
  internal_notes: string | null;
  document_id: string | null;
  deposition_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryInsert {
  id?: string;
  case_id: string;
  billing_rate_id?: string | null;
  activity_type: ActivityType;
  description: string;
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_hours: number;
  is_timer_entry?: boolean;
  rate_per_hour: number;
  amount: number;
  is_billable?: boolean;
  is_billed?: boolean;
  invoice_id?: string | null;
  status?: string;
  internal_notes?: string | null;
  document_id?: string | null;
  deposition_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TimeEntryUpdate = Partial<TimeEntryInsert>;

// =============================================================================
// 21. billing_rates
// =============================================================================
export interface BillingRateRow {
  id: string;
  activity_type: ActivityType;
  rate: number;
  description: string | null;
  effective_date: string;
  end_date: string | null;
  is_default: boolean;
  case_id: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingRateInsert {
  id?: string;
  activity_type: ActivityType;
  rate: number;
  description?: string | null;
  effective_date: string;
  end_date?: string | null;
  is_default?: boolean;
  case_id?: string | null;
  contact_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BillingRateUpdate = Partial<BillingRateInsert>;

// =============================================================================
// 22. invoices
// =============================================================================
export interface InvoiceRow {
  id: string;
  case_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number;
  discount_amount: number;
  discount_description: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  bill_to_contact_id: string | null;
  bill_to_name: string | null;
  bill_to_organization: string | null;
  bill_to_address: string | null;
  bill_to_email: string | null;
  payment_terms: number | null;
  payment_instructions: string | null;
  notes: string | null;
  internal_notes: string | null;
  template_id: string | null;
  sent_at: string | null;
  sent_method: string | null;
  viewed_at: string | null;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  id?: string;
  case_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  period_start?: string | null;
  period_end?: string | null;
  status?: InvoiceStatus;
  subtotal?: number;
  tax_rate?: number | null;
  tax_amount?: number;
  discount_amount?: number;
  discount_description?: string | null;
  total_amount?: number;
  amount_paid?: number;
  balance_due?: number;
  bill_to_contact_id?: string | null;
  bill_to_name?: string | null;
  bill_to_organization?: string | null;
  bill_to_address?: string | null;
  bill_to_email?: string | null;
  payment_terms?: number | null;
  payment_instructions?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  template_id?: string | null;
  sent_at?: string | null;
  sent_method?: string | null;
  viewed_at?: string | null;
  last_reminder_sent_at?: string | null;
  reminder_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type InvoiceUpdate = Partial<InvoiceInsert>;

// =============================================================================
// 23. invoice_line_items
// =============================================================================
export interface InvoiceLineItemRow {
  id: string;
  invoice_id: string | null;
  case_id: string | null;
  time_entry_id: string | null;
  line_type: LineItemType;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
  is_billed: boolean;
  created_at: string;
}

export interface InvoiceLineItemInsert {
  id?: string;
  invoice_id?: string | null;
  case_id?: string | null;
  time_entry_id?: string | null;
  line_type: LineItemType;
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
  sort_order?: number;
  is_billed?: boolean;
  created_at?: string;
}

export type InvoiceLineItemUpdate = Partial<InvoiceLineItemInsert>;

// =============================================================================
// 24. payments
// =============================================================================
export interface PaymentRow {
  id: string;
  case_id: string;
  invoice_id: string | null;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  amount: number;
  payment_date: string;
  reference_number: string | null;
  payer_contact_id: string | null;
  notes: string | null;
  deposited_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  id?: string;
  case_id: string;
  invoice_id?: string | null;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  amount: number;
  payment_date: string;
  reference_number?: string | null;
  payer_contact_id?: string | null;
  notes?: string | null;
  deposited_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PaymentUpdate = Partial<PaymentInsert>;

// =============================================================================
// 25. communication_logs
// =============================================================================
export interface CommunicationLogRow {
  id: string;
  case_id: string | null;
  contact_id: string | null;
  communication_type: CommunicationType;
  direction: string;
  status: string;
  subject: string | null;
  summary: string;
  detailed_notes: string | null;
  from_name: string | null;
  from_email: string | null;
  to_names: string[] | null;
  to_emails: string[] | null;
  cc_names: string[] | null;
  cc_emails: string[] | null;
  communication_date: string;
  duration_minutes: number | null;
  scheduled_date: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  follow_up_completed: boolean;
  follow_up_completed_at: string | null;
  attachment_document_ids: string[] | null;
  is_billable: boolean;
  time_entry_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLogInsert {
  id?: string;
  case_id?: string | null;
  contact_id?: string | null;
  communication_type: CommunicationType;
  direction?: string;
  status?: string;
  subject?: string | null;
  summary: string;
  detailed_notes?: string | null;
  from_name?: string | null;
  from_email?: string | null;
  to_names?: string[] | null;
  to_emails?: string[] | null;
  cc_names?: string[] | null;
  cc_emails?: string[] | null;
  communication_date: string;
  duration_minutes?: number | null;
  scheduled_date?: string | null;
  follow_up_required?: boolean;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  follow_up_completed?: boolean;
  follow_up_completed_at?: string | null;
  attachment_document_ids?: string[] | null;
  is_billable?: boolean;
  time_entry_id?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export type CommunicationLogUpdate = Partial<CommunicationLogInsert>;

// =============================================================================
// 26. case_milestones
// =============================================================================
export interface CaseMilestoneRow {
  id: string;
  case_id: string;
  milestone_type: MilestoneType;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_date: string | null;
  is_completed: boolean;
  is_overdue: boolean;
  reminder_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CaseMilestoneInsert {
  id?: string;
  case_id: string;
  milestone_type: MilestoneType;
  title: string;
  description?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  is_completed?: boolean;
  is_overdue?: boolean;
  reminder_date?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export type CaseMilestoneUpdate = Partial<CaseMilestoneInsert>;

// =============================================================================
// 27. case_notes
// =============================================================================
export interface CaseNoteRow {
  id: string;
  case_id: string;
  note_type: NoteType;
  title: string | null;
  content: string;
  is_pinned: boolean;
  is_private: boolean;
  related_document_id: string | null;
  related_deposition_id: string | null;
  related_report_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CaseNoteInsert {
  id?: string;
  case_id: string;
  note_type?: NoteType;
  title?: string | null;
  content: string;
  is_pinned?: boolean;
  is_private?: boolean;
  related_document_id?: string | null;
  related_deposition_id?: string | null;
  related_report_id?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export type CaseNoteUpdate = Partial<CaseNoteInsert>;

// =============================================================================
// 28. conflict_checks
// =============================================================================
export interface ConflictCheckRow {
  id: string;
  case_id: string;
  checked_name: string;
  checked_entity_type: string;
  matched_case_id: string | null;
  matched_contact_id: string | null;
  match_description: string | null;
  resolution: ConflictResolution;
  resolution_notes: string | null;
  resolved_at: string | null;
  checked_at: string;
  created_at: string;
}

export interface ConflictCheckInsert {
  id?: string;
  case_id: string;
  checked_name: string;
  checked_entity_type: string;
  matched_case_id?: string | null;
  matched_contact_id?: string | null;
  match_description?: string | null;
  resolution?: ConflictResolution;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  checked_at?: string;
  created_at?: string;
}

export type ConflictCheckUpdate = Partial<ConflictCheckInsert>;

// =============================================================================
// 29. system_settings
// =============================================================================
export interface SystemSettingRow {
  id: string;
  setting_key: string;
  setting_value: Json;
  setting_type: string;
  category: string;
  description: string | null;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingInsert {
  id?: string;
  setting_key: string;
  setting_value: Json;
  setting_type?: string;
  category?: string;
  description?: string | null;
  is_sensitive?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SystemSettingUpdate = Partial<SystemSettingInsert>;

// =============================================================================
// 30. user_preferences
// =============================================================================
export interface UserPreferenceRow {
  id: string;
  preference_key: string;
  preference_value: Json;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferenceInsert {
  id?: string;
  preference_key: string;
  preference_value: Json;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export type UserPreferenceUpdate = Partial<UserPreferenceInsert>;

// =============================================================================
// 31. audit_log
// =============================================================================
export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Json | null;
  new_data: Json | null;
  changed_fields: string[] | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data?: Json | null;
  new_data?: Json | null;
  changed_fields?: string[] | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  created_at?: string;
}

export type AuditLogUpdate = Partial<AuditLogInsert>;

// =============================================================================
// Contracts
// =============================================================================
export interface ContractRow {
  id: string;
  case_id: string;
  contract_type: string;
  contract_number: string | null;
  title: string;
  status: string;
  firm_name: string | null;
  firm_contact_name: string | null;
  firm_address: string | null;
  firm_email: string | null;
  firm_phone: string | null;
  contact_id: string | null;
  hourly_rate: number;
  deposition_rate: number;
  trial_rate: number;
  retainer_amount: number;
  cancellation_fee_hours: number;
  payment_terms_days: number;
  scope_description: string | null;
  additional_terms: string | null;
  rendered_html: string | null;
  sent_at: string | null;
  sent_via: string | null;
  signed_at: string | null;
  signed_by: string | null;
  signature_data: string | null;
  signature_ip: string | null;
  signature_timestamp: string | null;
  signature_user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractInsert {
  id?: string;
  case_id: string;
  contract_type?: string;
  contract_number?: string | null;
  title: string;
  status?: string;
  firm_name?: string | null;
  firm_contact_name?: string | null;
  firm_address?: string | null;
  firm_email?: string | null;
  firm_phone?: string | null;
  contact_id?: string | null;
  hourly_rate?: number;
  deposition_rate?: number;
  trial_rate?: number;
  retainer_amount?: number;
  cancellation_fee_hours?: number;
  payment_terms_days?: number;
  scope_description?: string | null;
  additional_terms?: string | null;
  rendered_html?: string | null;
  sent_at?: string | null;
  sent_via?: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  signature_data?: string | null;
  signature_ip?: string | null;
  signature_timestamp?: string | null;
  signature_user_agent?: string | null;
}

export type ContractUpdate = Partial<ContractInsert>;

// =============================================================================
// Shared Links
// =============================================================================
export type SharedLinkEntityType = 'report' | 'contract' | 'invoice';
export type SharedLinkPermission = 'view' | 'edit' | 'sign';
export type SharedLinkEventType = 'viewed' | 'edited' | 'signed' | 'downloaded' | 'pin_failed' | 'expired_access';

export interface SharedLinkRow {
  id: string;
  entity_type: SharedLinkEntityType;
  entity_id: string;
  token: string;
  permission: SharedLinkPermission;
  recipient_name: string | null;
  recipient_email: string | null;
  contact_id: string | null;
  pin_hash: string | null;
  expires_at: string;
  max_views: number | null;
  view_count: number;
  is_active: boolean;
  revoked_at: string | null;
  last_accessed_at: string | null;
  last_accessed_ip: string | null;
  original_html: string | null;
  edited_html: string | null;
  edited_at: string | null;
  edited_by_name: string | null;
  editor_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharedLinkInsert {
  id?: string;
  entity_type: SharedLinkEntityType;
  entity_id: string;
  token: string;
  permission?: SharedLinkPermission;
  recipient_name?: string | null;
  recipient_email?: string | null;
  contact_id?: string | null;
  pin_hash?: string | null;
  expires_at: string;
  max_views?: number | null;
  view_count?: number;
  is_active?: boolean;
  editor_notes?: string | null;
}

export type SharedLinkUpdate = Partial<SharedLinkInsert>;

export interface SharedLinkEventRow {
  id: string;
  shared_link_id: string;
  event_type: SharedLinkEventType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// =============================================================================
// Invoice Templates
// =============================================================================
export interface InvoiceTemplateRow {
  id: string;
  template_name: string;
  description: string | null;
  default_payment_terms: number;
  default_notes: string | null;
  payment_instructions: string | null;
  header_text: string | null;
  footer_text: string | null;
  default_tax_rate: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTemplateInsert {
  id?: string;
  template_name: string;
  description?: string | null;
  default_payment_terms?: number;
  default_notes?: string | null;
  payment_instructions?: string | null;
  header_text?: string | null;
  footer_text?: string | null;
  default_tax_rate?: number | null;
  is_default?: boolean;
  is_active?: boolean;
}

export type InvoiceTemplateUpdate = Partial<InvoiceTemplateInsert>;

// =============================================================================
// Meetings
// =============================================================================
export interface MeetingRow {
  id: string;
  case_id: string;
  meeting_name: string;
  meeting_date: string;
  meeting_type: MeetingType;
  duration_seconds: number | null;
  recording_file_path: string | null;
  recording_file_size: number | null;
  transcript_text: string | null;
  transcript_status: TranscriptStatus;
  ai_summary: string | null;
  ai_key_points: Json;
  ai_action_items: Json;
  participants: Json;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingInsert {
  id?: string;
  case_id: string;
  meeting_name: string;
  meeting_date: string;
  meeting_type?: MeetingType;
  duration_seconds?: number | null;
  recording_file_path?: string | null;
  recording_file_size?: number | null;
  transcript_text?: string | null;
  transcript_status?: TranscriptStatus;
  ai_summary?: string | null;
  ai_key_points?: Json;
  ai_action_items?: Json;
  participants?: Json;
  notes?: string | null;
}

export type MeetingUpdate = Partial<MeetingInsert>;

// =============================================================================
// Database interface -- mirrors Supabase generated types pattern
// =============================================================================
export interface Database {
  public: {
    Tables: {
      cases: {
        Row: CaseRow;
        Insert: CaseInsert;
        Update: CaseUpdate;
      };
      contacts: {
        Row: ContactRow;
        Insert: ContactInsert;
        Update: ContactUpdate;
      };
      case_contacts: {
        Row: CaseContactRow;
        Insert: CaseContactInsert;
        Update: CaseContactUpdate;
      };
      documents: {
        Row: DocumentRow;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
      };
      document_folders: {
        Row: DocumentFolderRow;
        Insert: DocumentFolderInsert;
        Update: DocumentFolderUpdate;
      };
      document_annotations: {
        Row: DocumentAnnotationRow;
        Insert: DocumentAnnotationInsert;
        Update: DocumentAnnotationUpdate;
      };
      medical_records_timeline: {
        Row: MedicalRecordsTimelineRow;
        Insert: MedicalRecordsTimelineInsert;
        Update: MedicalRecordsTimelineUpdate;
      };
      depositions: {
        Row: DepositionRow;
        Insert: DepositionInsert;
        Update: DepositionUpdate;
      };
      deposition_excerpts: {
        Row: DepositionExcerptRow;
        Insert: DepositionExcerptInsert;
        Update: DepositionExcerptUpdate;
      };
      report_templates: {
        Row: ReportTemplateRow;
        Insert: ReportTemplateInsert;
        Update: ReportTemplateUpdate;
      };
      template_sections: {
        Row: TemplateSectionRow;
        Insert: TemplateSectionInsert;
        Update: TemplateSectionUpdate;
      };
      template_section_mappings: {
        Row: TemplateSectionMappingRow;
        Insert: TemplateSectionMappingInsert;
        Update: TemplateSectionMappingUpdate;
      };
      reports: {
        Row: ReportRow;
        Insert: ReportInsert;
        Update: ReportUpdate;
      };
      report_generation_queue: {
        Row: ReportGenerationQueueRow;
        Insert: ReportGenerationQueueInsert;
        Update: ReportGenerationQueueUpdate;
      };
      ai_conversations: {
        Row: AIConversationRow;
        Insert: AIConversationInsert;
        Update: AIConversationUpdate;
      };
      ai_messages: {
        Row: AIMessageRow;
        Insert: AIMessageInsert;
        Update: AIMessageUpdate;
      };
      ai_tasks: {
        Row: AITaskRow;
        Insert: AITaskInsert;
        Update: AITaskUpdate;
      };
      ai_prompts_library: {
        Row: AIPromptsLibraryRow;
        Insert: AIPromptsLibraryInsert;
        Update: AIPromptsLibraryUpdate;
      };
      ai_context_rules: {
        Row: AIContextRuleRow;
        Insert: AIContextRuleInsert;
        Update: AIContextRuleUpdate;
      };
      time_entries: {
        Row: TimeEntryRow;
        Insert: TimeEntryInsert;
        Update: TimeEntryUpdate;
      };
      billing_rates: {
        Row: BillingRateRow;
        Insert: BillingRateInsert;
        Update: BillingRateUpdate;
      };
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
      };
      invoice_line_items: {
        Row: InvoiceLineItemRow;
        Insert: InvoiceLineItemInsert;
        Update: InvoiceLineItemUpdate;
      };
      payments: {
        Row: PaymentRow;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      communication_logs: {
        Row: CommunicationLogRow;
        Insert: CommunicationLogInsert;
        Update: CommunicationLogUpdate;
      };
      case_milestones: {
        Row: CaseMilestoneRow;
        Insert: CaseMilestoneInsert;
        Update: CaseMilestoneUpdate;
      };
      case_notes: {
        Row: CaseNoteRow;
        Insert: CaseNoteInsert;
        Update: CaseNoteUpdate;
      };
      conflict_checks: {
        Row: ConflictCheckRow;
        Insert: ConflictCheckInsert;
        Update: ConflictCheckUpdate;
      };
      system_settings: {
        Row: SystemSettingRow;
        Insert: SystemSettingInsert;
        Update: SystemSettingUpdate;
      };
      user_preferences: {
        Row: UserPreferenceRow;
        Insert: UserPreferenceInsert;
        Update: UserPreferenceUpdate;
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      contracts: {
        Row: ContractRow;
        Insert: ContractInsert;
        Update: ContractUpdate;
      };
      shared_links: {
        Row: SharedLinkRow;
        Insert: SharedLinkInsert;
        Update: SharedLinkUpdate;
      };
      invoice_templates: {
        Row: InvoiceTemplateRow;
        Insert: InvoiceTemplateInsert;
        Update: InvoiceTemplateUpdate;
      };
      meetings: {
        Row: MeetingRow;
        Insert: MeetingInsert;
        Update: MeetingUpdate;
      };
      portal_invites: {
        Row: PortalInviteRow;
        Insert: PortalInviteInsert;
        Update: PortalInviteUpdate;
      };
      portal_messages: {
        Row: PortalMessageRow;
        Insert: PortalMessageInsert;
        Update: PortalMessageUpdate;
      };
    };
  };
}

// =============================================================================
// Portal Invites
// =============================================================================
export type PortalSenderType = 'attorney' | 'provider';

export interface PortalInviteRow {
  id: string;
  case_id: string;
  contact_id: string;
  token: string;
  can_view_summary: boolean;
  can_view_timeline: boolean;
  can_message: boolean;
  can_view_reports: boolean;
  can_edit_reports: boolean;
  can_upload_documents: boolean;
  is_active: boolean;
  expires_at: string;
  last_accessed_at: string | null;
  view_count: number;
  invited_by: string | null;
  invitation_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalInviteInsert {
  id?: string;
  case_id: string;
  contact_id: string;
  token: string;
  can_view_summary?: boolean;
  can_view_timeline?: boolean;
  can_message?: boolean;
  can_view_reports?: boolean;
  can_edit_reports?: boolean;
  can_upload_documents?: boolean;
  is_active?: boolean;
  expires_at: string;
  invited_by?: string | null;
  invitation_message?: string | null;
}

export type PortalInviteUpdate = Partial<PortalInviteInsert>;

export interface PortalMessageRow {
  id: string;
  portal_invite_id: string;
  case_id: string;
  sender_type: PortalSenderType;
  sender_name: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PortalMessageInsert {
  id?: string;
  portal_invite_id: string;
  case_id: string;
  sender_type: PortalSenderType;
  sender_name: string;
  content: string;
  is_read?: boolean;
}

export type PortalMessageUpdate = Partial<PortalMessageInsert>;

// =============================================================================
// Convenience type aliases
// =============================================================================

/** Extract the Row type for a given table name */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Extract the Insert type for a given table name */
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Extract the Update type for a given table name */
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
