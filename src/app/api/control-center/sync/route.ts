import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getControlCenterClient,
  transformCaseToProject,
  transformContactForCC,
  mapMilestonePriority,
} from '@/lib/control-center'

function getEWClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Find or create a CC project for an EW case
// Looks up by fields->'ew_case_id' match, falls back to name match
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
    .filter('fields', 'cs', JSON.stringify({ ew_case_id: ewCaseId }))
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Update existing project
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

  // Create new project
  const { data, error } = await cc
    .from('projects')
    .insert(project)
    .select('id')
    .single()

  return { id: data?.id, error }
}

// Map EW milestone priority to CC shared_todos priority (capitalized)
function mapMilestonePriorityCC(milestoneType: string): string {
  const raw = mapMilestonePriority(milestoneType)
  // CC shared_todos uses: 'Critical', 'High', 'Medium', 'Low'
  const map: Record<string, string> = {
    urgent: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }
  return map[raw] || 'Medium'
}

export async function POST(req: Request) {
  try {
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

    // 1. Fetch cases from EW
    let casesQuery = ew
      .from('cases')
      .select('*, case_contacts(*, contacts(*)), case_milestones(*)')

    if (caseId) {
      casesQuery = casesQuery.eq('id', caseId)
    } else {
      casesQuery = casesQuery.eq('is_archived', false)
    }

    const { data: cases, error: casesError } = await casesQuery
    if (casesError) {
      return NextResponse.json({ error: casesError.message }, { status: 500 })
    }

    const results = {
      projects_synced: 0,
      contacts_synced: 0,
      todos_synced: 0,
      errors: [] as string[],
    }

    for (const ewCase of cases || []) {
      // 2. Find or create CC project for this case
      const { id: ccProjectId, error: projectError } = await findOrCreateProject(cc, ewCase)

      if (projectError || !ccProjectId) {
        results.errors.push(`Project ${ewCase.case_number}: ${projectError?.message || 'No ID returned'}`)
        continue
      }
      results.projects_synced++

      // 3. Sync contacts linked to this case
      const caseContacts = (ewCase.case_contacts || []) as Array<{
        role: string
        contacts: Record<string, unknown>
      }>

      for (const ccLink of caseContacts) {
        const contact = ccLink.contacts
        if (!contact) continue

        const ccContact = transformContactForCC(contact)

        // Find existing CC contact by email or name match
        let ccContactId: string | null = null

        if (contact.email) {
          const { data: existingByEmail } = await cc
            .from('contacts')
            .select('id')
            .eq('email', contact.email)
            .limit(1)
            .maybeSingle()
          ccContactId = existingByEmail?.id || null
        }

        if (!ccContactId) {
          const { data: existingByName } = await cc
            .from('contacts')
            .select('id')
            .eq('first_name', ccContact.first_name)
            .eq('last_name', ccContact.last_name)
            .limit(1)
            .maybeSingle()
          ccContactId = existingByName?.id || null
        }

        if (ccContactId) {
          // Update existing contact
          const { error: contactError } = await cc
            .from('contacts')
            .update({ ...ccContact, updated_at: new Date().toISOString() })
            .eq('id', ccContactId)

          if (contactError) {
            results.errors.push(`Contact ${contact.first_name} ${contact.last_name}: ${contactError.message}`)
            continue
          }
        } else {
          // Create new contact
          const { data: newContact, error: contactError } = await cc
            .from('contacts')
            .insert(ccContact)
            .select('id')
            .single()

          if (contactError || !newContact) {
            results.errors.push(`Contact ${contact.first_name} ${contact.last_name}: ${contactError?.message || 'No ID returned'}`)
            continue
          }
          ccContactId = newContact.id
        }

        results.contacts_synced++

        // Link contact to project via project_contacts (composite PK)
        const role = ccLink.role === 'retaining_counsel' ? 'stakeholder' : 'member'
        await cc.from('project_contacts').upsert(
          {
            project_id: ccProjectId,
            contact_id: ccContactId,
            role,
          },
          { onConflict: 'project_id,contact_id' }
        )
      }

      // 4. Sync milestones as shared_todos
      const milestones = (ewCase.case_milestones || []) as Array<Record<string, unknown>>

      for (const milestone of milestones) {
        const todoContent = `[${ewCase.case_number || 'EW'}] ${milestone.title || 'Milestone'}`
        const todoPriority = mapMilestonePriorityCC((milestone.milestone_type as string) || 'other')
        const todoStatus = milestone.is_completed ? 'Complete' : 'Not Started'

        // Look for existing todo by content match + project
        const { data: existingTodo } = await cc
          .from('shared_todos')
          .select('id')
          .eq('project_id', ccProjectId)
          .eq('content', todoContent)
          .limit(1)
          .maybeSingle()

        if (existingTodo) {
          const { error: todoError } = await cc
            .from('shared_todos')
            .update({
              priority: todoPriority,
              status: todoStatus,
              due_date: milestone.due_date || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingTodo.id)

          if (todoError) {
            results.errors.push(`Todo ${milestone.title}: ${todoError.message}`)
            continue
          }
        } else {
          const { error: todoError } = await cc
            .from('shared_todos')
            .insert({
              content: todoContent,
              from_user: 'mark',
              for_user: 'mark',
              priority: todoPriority,
              status: todoStatus,
              due_date: milestone.due_date || null,
              project_id: ccProjectId,
              category: 'expert_witness',
            })

          if (todoError) {
            results.errors.push(`Todo ${milestone.title}: ${todoError.message}`)
            continue
          }
        }

        results.todos_synced++
      }

      // 5. Update last_synced timestamp on EW case
      await ew
        .from('cases')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', ewCase.id)
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
