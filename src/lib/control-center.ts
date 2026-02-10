import { createClient } from '@supabase/supabase-js'

// Control Center Supabase client (separate instance)
const CC_URL = process.env.CONTROL_CENTER_SUPABASE_URL || ''
const CC_SERVICE_KEY = process.env.CONTROL_CENTER_SERVICE_ROLE_KEY || ''

export function getControlCenterClient() {
  if (!CC_URL || !CC_SERVICE_KEY) {
    throw new Error('Control Center Supabase credentials not configured. Set CONTROL_CENTER_SUPABASE_URL and CONTROL_CENTER_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(CC_URL, CC_SERVICE_KEY)
}

// Status mapping: EW case status → CC project status
// CC projects table uses: 'Active', 'On Hold', 'Complete'
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

// Priority mapping: EW priority → CC project priority
export function mapCasePriorityToProject(ewPriority: string): string {
  const map: Record<string, string> = {
    urgent: 'critical',
    high: 'high',
    normal: 'medium',
    low: 'low',
  }
  return map[ewPriority] || 'medium'
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

// Milestone type → CC task priority
export function mapMilestonePriority(milestoneType: string): string {
  const map: Record<string, string> = {
    trial_date_set: 'urgent',
    deposition: 'high',
    report_due: 'high',
    records_review: 'medium',
    filing_deadline: 'high',
    discovery: 'medium',
    mediation: 'medium',
    other: 'low',
  }
  return map[milestoneType] || 'medium'
}

// Transform EW case → CC project
// CC projects schema: id, name, description, status, color, calendar_link, fields (jsonb), owner, shared_with, archived
export function transformCaseToProject(ewCase: Record<string, unknown>) {
  return {
    name: `EW: ${ewCase.case_number || ''} - ${ewCase.case_name || ''}`.trim(),
    description: (ewCase.case_name as string) || '',
    status: mapCaseStatusToProject(ewCase.status as string),
    color: '#C9A84C', // Gold for expert witness projects
    owner: 'mark' as const,
    fields: JSON.stringify({
      source: 'expert_witness',
      ew_case_id: ewCase.id,
      ew_case_number: ewCase.case_number,
      case_type: ewCase.case_type,
      priority: ewCase.priority,
      deadline_next: ewCase.deadline_next,
      deadline_description: ewCase.deadline_description,
      outstanding_balance: ewCase.outstanding_balance,
    }),
  }
}

// Transform EW contact → CC contact fields
export function transformContactForCC(ewContact: Record<string, unknown>) {
  return {
    first_name: ewContact.first_name,
    last_name: ewContact.last_name,
    email: ewContact.email || null,
    phone: ewContact.phone || null,
    company: ewContact.organization || null,
    profession_category: mapContactType((ewContact.contact_type as string) || 'other'),
  }
}

// Transform EW milestone → CC task
export function transformMilestoneToTask(milestone: Record<string, unknown>, caseNumber: string) {
  return {
    title: `[${caseNumber}] ${milestone.title || 'Milestone'}`,
    description: (milestone.description as string) || null,
    status: milestone.is_completed ? 'done' : 'not_started',
    priority: mapMilestonePriority((milestone.milestone_type as string) || 'other'),
    due_date: milestone.due_date || null,
    completed_at: milestone.is_completed ? milestone.completed_at || new Date().toISOString() : null,
    source: 'expert_witness',
  }
}
