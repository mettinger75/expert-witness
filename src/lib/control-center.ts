import { createClient } from '@supabase/supabase-js'

// Control Center Supabase client (separate instance)
const CC_URL = process.env.CONTROL_CENTER_SUPABASE_URL || ''
const CC_SERVICE_KEY = process.env.CONTROL_CENTER_SERVICE_ROLE_KEY || ''

// Expert Witness area of focus in CC
export const EW_AREA_ID = '3e4c6885-d7d8-47e4-ab0e-ebff2a6a4f0a'

export function getControlCenterClient() {
  if (!CC_URL || !CC_SERVICE_KEY) {
    throw new Error('Control Center Supabase credentials not configured. Set CONTROL_CENTER_SUPABASE_URL and CONTROL_CENTER_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(CC_URL, CC_SERVICE_KEY)
}

// Status mapping: EW case status → CC project status
export function mapCaseStatusToProject(ewStatus: string): string {
  const map: Record<string, string> = {
    inquiry: 'Active',
    pending: 'Active',
    active: 'Active',
    accepted: 'Active',
    review: 'Active',
    on_hold: 'On Hold',
    closed: 'Complete',
    declined: 'Complete',
    withdrawn: 'Complete',
  }
  return map[ewStatus] || 'Active'
}

// EW priority → CC project priority (integer 1-5)
export function mapCasePriorityToInt(ewPriority: string): number {
  const map: Record<string, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4,
  }
  return map[ewPriority] || 3
}

// Contact type mapping: EW contact_type → CC profession_category
export function mapContactType(ewType: string): string {
  const map: Record<string, string> = {
    attorney: 'Legal',
    plaintiff_attorney: 'Legal',
    defense_attorney: 'Legal',
    expert: 'Medical',
    medical_provider: 'Medical',
    insurance: 'Business',
    court: 'Legal',
    other: 'Other',
  }
  return map[ewType] || 'Other'
}

// Milestone type → CC task priority (integer 1-5)
export function mapMilestonePriorityInt(milestoneType: string): number {
  const map: Record<string, number> = {
    trial_date_set: 1,
    deposition: 2,
    report_due: 2,
    filing_deadline: 2,
    records_review: 3,
    discovery: 3,
    mediation: 3,
    other: 4,
  }
  return map[milestoneType] || 3
}

// Active case statuses — only these get synced as CC projects
export const ACTIVE_CASE_STATUSES = ['active', 'inquiry', 'pending', 'accepted', 'review']

// Transform EW case → CC project
// Note: fields must be a plain object, NOT JSON.stringify'd — Supabase handles JSONB serialization
export function transformCaseToProject(ewCase: Record<string, unknown>) {
  const caseName = (ewCase.case_name as string) || ''
  const side = (ewCase.side as string) || ''
  const sideLabel = side === 'plaintiff' ? 'Plaintiff' : side === 'defense' ? 'Defense' : ''

  return {
    name: `EW: ${ewCase.case_number || ''} - ${caseName}`.trim(),
    description: `${caseName}${sideLabel ? ` (${sideLabel})` : ''}`,
    status: mapCaseStatusToProject(ewCase.status as string),
    color: '#DFC06A',
    owner: 'mark' as const,
    priority: mapCasePriorityToInt(ewCase.priority as string),
    area_id: EW_AREA_ID,
    outcome: ewCase.deadline_description
      ? `Next deadline: ${ewCase.deadline_description}`
      : null,
    next_action: ewCase.deadline_next
      ? `Deadline: ${ewCase.deadline_next}`
      : null,
    fields: {
      source: 'expert_witness',
      ew_case_id: ewCase.id,
      ew_case_number: ewCase.case_number,
      case_type: ewCase.case_type,
      side: ewCase.side,
      priority: ewCase.priority,
      specialty_area: ewCase.specialty_area,
      deadline_next: ewCase.deadline_next,
      deadline_description: ewCase.deadline_description,
      outstanding_balance: ewCase.outstanding_balance,
    },
  }
}

// Transform EW contact → CC contact fields
// CC contacts require: first_name, last_name (NOT NULL), realms (NOT NULL array), status (NOT NULL enum)
export function transformContactForCC(ewContact: Record<string, unknown>) {
  return {
    first_name: (ewContact.first_name as string) || 'Unknown',
    last_name: (ewContact.last_name as string) || 'Unknown',
    email: (ewContact.email as string) || null,
    phone: (ewContact.phone_primary as string) || null,
    company: (ewContact.organization_name as string) || null,
    role_title: (ewContact.title as string) || null,
    profession_category: mapContactType((ewContact.contact_type as string) || 'other'),
    realms: ['business'],
    status: 'active' as const,
    area_id: EW_AREA_ID,
    tags: ['expert-witness'],
  }
}

// Transform EW milestone → CC task
// Uses correct EW column names: milestone_name, target_date
export function transformMilestoneToTask(
  milestone: Record<string, unknown>,
  caseNumber: string,
  ccProjectId: string
) {
  const name = (milestone.milestone_name as string) || 'Milestone'
  return {
    title: `[${caseNumber}] ${name}`,
    description: (milestone.description as string) || null,
    status: milestone.status === 'completed' ? 'done' : 'todo',
    priority: mapMilestonePriorityInt((milestone.milestone_type as string) || 'other'),
    due_date: (milestone.target_date as string) || null,
    completed_at: milestone.status === 'completed'
      ? (milestone.completed_at as string) || new Date().toISOString()
      : null,
    source: 'expert_witness',
    project_id: ccProjectId,
    area_id: EW_AREA_ID,
    is_recurring: false,
  }
}
