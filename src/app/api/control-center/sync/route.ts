import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminUser } from '@/lib/api-admin-auth'
import {
  getControlCenterClient,
  transformCaseToProject,
  transformContactForCC,
  transformMilestoneToTask,
  EW_AREA_ID,
  ACTIVE_CASE_STATUSES,
} from '@/lib/control-center'

function getEWClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Find or create a CC project for an EW case
async function findOrCreateProject(
  cc: ReturnType<typeof getControlCenterClient>,
  ewCase: Record<string, unknown>
) {
  const project = transformCaseToProject(ewCase)
  const ewCaseId = ewCase.id as string

  // Try to find existing project by ew_case_id in fields JSONB
  const { data: existing } = await cc
    .from('projects')
    .select('id')
    .eq('fields->>ew_case_id', ewCaseId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { data, error } = await cc
      .from('projects')
      .update({
        ...project,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single()

    return { id: data?.id || existing.id, error }
  }

  // Create new project with the original case creation date
  const { data, error } = await cc
    .from('projects')
    .insert({
      ...project,
      created_at: (ewCase.created_at as string) || new Date().toISOString(),
    })
    .select('id')
    .single()

  return { id: data?.id, error }
}

// Find or create a CC task for an EW milestone
async function findOrCreateTask(
  cc: ReturnType<typeof getControlCenterClient>,
  milestone: Record<string, unknown>,
  caseNumber: string,
  ccProjectId: string
) {
  const task = transformMilestoneToTask(milestone, caseNumber, ccProjectId)

  // Look for existing task by title match + project
  const { data: existing } = await cc
    .from('tasks')
    .select('id')
    .eq('project_id', ccProjectId)
    .eq('title', task.title)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await cc
      .from('tasks')
      .update({
        ...task,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    return { id: existing.id, error }
  }

  const { data, error } = await cc
    .from('tasks')
    .insert(task)
    .select('id')
    .single()

  return { id: data?.id, error }
}

// Find or create a CC contact from an EW contact
async function findOrCreateContact(
  cc: ReturnType<typeof getControlCenterClient>,
  ewContact: Record<string, unknown>
) {
  const ccContact = transformContactForCC(ewContact)
  let ccContactId: string | null = null

  // Find by email first (most reliable)
  if (ccContact.email) {
    const { data } = await cc
      .from('contacts')
      .select('id')
      .eq('email', ccContact.email)
      .limit(1)
      .maybeSingle()
    ccContactId = data?.id || null
  }

  // Fall back to name match
  if (!ccContactId) {
    const { data } = await cc
      .from('contacts')
      .select('id')
      .eq('first_name', ccContact.first_name)
      .eq('last_name', ccContact.last_name)
      .limit(1)
      .maybeSingle()
    ccContactId = data?.id || null
  }

  if (ccContactId) {
    // Update existing — don't overwrite realms/status/area_id if already set
    const { error } = await cc
      .from('contacts')
      .update({
        phone: ccContact.phone,
        company: ccContact.company,
        role_title: ccContact.role_title,
        profession_category: ccContact.profession_category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ccContactId)

    return { id: ccContactId, error, created: false }
  }

  // Create new contact with all required fields
  const { data, error } = await cc
    .from('contacts')
    .insert(ccContact)
    .select('id')
    .single()

  return { id: data?.id || null, error, created: true }
}

// Archive CC projects for cases that are no longer active
async function archiveInactiveCaseProjects(
  cc: ReturnType<typeof getControlCenterClient>,
  activeCaseIds: string[]
) {
  // Find all EW projects in CC
  const { data: allEWProjects } = await cc
    .from('projects')
    .select('id, fields')
    .eq('area_id', EW_AREA_ID)
    .eq('archived', false)

  if (!allEWProjects) return 0

  let archived = 0
  for (const proj of allEWProjects) {
    const fields = proj.fields as Record<string, unknown> | null
    if (!fields || fields.source !== 'expert_witness') continue
    const ewCaseId = fields.ew_case_id as string
    if (ewCaseId && !activeCaseIds.includes(ewCaseId)) {
      await cc
        .from('projects')
        .update({ archived: true, status: 'Complete', updated_at: new Date().toISOString() })
        .eq('id', proj.id)
      archived++
    }
  }
  return archived
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req)
    if (auth.error) return auth.error

    const body = await req.json().catch(() => ({}))
    const caseId = body.case_id as string | undefined

    const ew = getEWClient()
    let cc: ReturnType<typeof getControlCenterClient>
    try {
      cc = getControlCenterClient()
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 500 }
      )
    }

    // Fetch ONLY active cases from EW (with relations)
    let casesQuery = ew
      .from('cases')
      .select('*, case_contacts(*, contacts(*)), case_milestones(*)')

    if (caseId) {
      casesQuery = casesQuery.eq('id', caseId)
    } else {
      casesQuery = casesQuery.in('status', ACTIVE_CASE_STATUSES)
    }

    const { data: cases, error: casesError } = await casesQuery
    if (casesError) {
      return NextResponse.json({ error: casesError.message }, { status: 500 })
    }

    const results = {
      projects_synced: 0,
      contacts_synced: 0,
      contacts_created: 0,
      tasks_synced: 0,
      projects_archived: 0,
      errors: [] as string[],
    }

    const activeCaseIds: string[] = []

    for (const ewCase of cases || []) {
      activeCaseIds.push(ewCase.id as string)

      // 1. Find or create CC project for this case
      const { id: ccProjectId, error: projectError } = await findOrCreateProject(cc, ewCase)

      if (projectError || !ccProjectId) {
        results.errors.push(`Project ${ewCase.case_number}: ${projectError?.message || 'No ID returned'}`)
        continue
      }
      results.projects_synced++

      // 2. Sync contacts linked to this case
      const caseContacts = (ewCase.case_contacts || []) as Array<{
        role: string
        contacts: Record<string, unknown>
      }>

      for (const ccLink of caseContacts) {
        const contact = ccLink.contacts
        if (!contact) continue

        const { id: ccContactId, error: contactError, created } = await findOrCreateContact(cc, contact)

        if (contactError || !ccContactId) {
          results.errors.push(`Contact ${contact.first_name} ${contact.last_name}: ${contactError?.message || 'No ID returned'}`)
          continue
        }

        results.contacts_synced++
        if (created) results.contacts_created++

        // Link contact to project
        const role = ccLink.role === 'retaining_attorney' || ccLink.role === 'retaining_counsel'
          ? 'stakeholder'
          : 'member'
        await cc.from('project_contacts').upsert(
          { project_id: ccProjectId, contact_id: ccContactId, role },
          { onConflict: 'project_id,contact_id' }
        )
      }

      // 3. Sync milestones as CC tasks
      const milestones = (ewCase.case_milestones || []) as Array<Record<string, unknown>>

      for (const milestone of milestones) {
        const { error: taskError } = await findOrCreateTask(
          cc,
          milestone,
          (ewCase.case_number as string) || 'EW',
          ccProjectId
        )

        if (taskError) {
          results.errors.push(`Task ${milestone.milestone_name}: ${taskError.message}`)
          continue
        }
        results.tasks_synced++
      }

      // 4. Update last_synced timestamp on EW case
      await ew
        .from('cases')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', ewCase.id)
    }

    // 5. Archive CC projects for cases that are no longer active
    if (!caseId) {
      results.projects_archived = await archiveInactiveCaseProjects(cc, activeCaseIds)
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
