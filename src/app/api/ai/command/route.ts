import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const TOOLS = [
  {
    name: 'query_database',
    description: 'Execute a read-only SQL query against the Expert Witness database. Only SELECT queries are allowed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' as const, description: 'SELECT query to execute' },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_case',
    description: 'Update fields on an existing case record.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string' as const, description: 'UUID of the case' },
        updates: {
          type: 'object' as const,
          description: 'Fields to update. Valid fields include: case_name, case_type, status, priority, side, specialty_area, date_of_incident, jurisdiction_state, jurisdiction_court, patient_name, brief_summary, key_issues, preliminary_opinion, opinion_strength, opinion_summary, notes, deadline_next, deadline_description, deadline_report, deadline_deposition, deadline_trial, retainer_required, retainer_amount, retainer_received, estimated_hours, tags, is_archived',
        },
      },
      required: ['case_id', 'updates'],
    },
  },
  {
    name: 'create_case',
    description: 'Create a new expert witness case.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_name: { type: 'string' as const, description: 'Name of the case (e.g. Smith v. Memorial Hospital)' },
        case_type: { type: 'string' as const, description: 'Type: medical_malpractice, personal_injury, wrongful_death, product_liability, other' },
        status: { type: 'string' as const, description: 'Initial status (default: inquiry)' },
        priority: { type: 'string' as const, description: 'Priority: urgent, high, normal, low' },
        side: { type: 'string' as const, description: 'Which side: plaintiff or defense' },
        specialty_area: { type: 'string' as const, description: 'Medical specialty area' },
        brief_summary: { type: 'string' as const, description: 'Brief summary of the case' },
        notes: { type: 'string' as const, description: 'Additional notes' },
        referral_source: { type: 'string' as const, description: 'How the case was referred' },
      },
      required: ['case_name'],
    },
  },
  {
    name: 'create_contact',
    description: 'Create a new contact (attorney, medical provider, expert, etc).',
    input_schema: {
      type: 'object' as const,
      properties: {
        first_name: { type: 'string' as const },
        last_name: { type: 'string' as const },
        contact_type: { type: 'string' as const, description: 'REQUIRED. One of: attorney, plaintiff_attorney, defense_attorney, expert, medical_provider, insurance, court, other' },
        email: { type: 'string' as const },
        phone_primary: { type: 'string' as const, description: 'Primary phone number' },
        organization_name: { type: 'string' as const, description: 'Organization or firm name' },
        title: { type: 'string' as const, description: 'Professional title' },
        specialty: { type: 'string' as const, description: 'Area of specialty' },
        bar_number: { type: 'string' as const, description: 'Bar number for attorneys' },
        address_street: { type: 'string' as const },
        address_city: { type: 'string' as const },
        address_state: { type: 'string' as const },
        address_zip: { type: 'string' as const },
        notes: { type: 'string' as const },
      },
      required: ['first_name', 'last_name', 'contact_type'],
    },
  },
  {
    name: 'link_contact_to_case',
    description: 'Link an existing contact to a case with a specific role.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string' as const },
        contact_id: { type: 'string' as const },
        role: { type: 'string' as const, description: 'retaining_counsel, opposing_counsel, plaintiff, defendant, expert, treating_physician, other' },
        is_primary: { type: 'boolean' as const, description: 'Whether this is the primary contact in this role' },
      },
      required: ['case_id', 'contact_id', 'role'],
    },
  },
  {
    name: 'create_milestone',
    description: 'Add a milestone/deadline to a case.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string' as const },
        milestone_name: { type: 'string' as const, description: 'Name of the milestone' },
        target_date: { type: 'string' as const, description: 'Target date in ISO format (YYYY-MM-DD)' },
        milestone_type: { type: 'string' as const, description: 'trial_date_set, deposition, report_due, records_review, filing_deadline, discovery, mediation, other' },
        description: { type: 'string' as const },
        status: { type: 'string' as const, description: 'Status: pending, in_progress, completed, overdue. Default: pending' },
      },
      required: ['case_id', 'milestone_name'],
    },
  },
  {
    name: 'create_time_entry',
    description: 'Log a time entry for work performed on a case.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string' as const, description: 'UUID of the case' },
        activity_type: { type: 'string' as const, description: 'Type of activity: record_review, file_review, research, report_writing, deposition_prep, deposition_testimony, trial_prep, trial_testimony, phone_conference, consultation, court_appearance, correspondence, travel, administrative, other' },
        description: { type: 'string' as const, description: 'Description of work performed' },
        duration_hours: { type: 'number' as const, description: 'Hours worked (e.g. 1.5)' },
        rate_per_hour: { type: 'number' as const, description: 'Hourly rate in dollars' },
        date: { type: 'string' as const, description: 'Date of work in YYYY-MM-DD format. Defaults to today.' },
        is_billable: { type: 'boolean' as const, description: 'Whether this entry is billable. Default: true' },
      },
      required: ['case_id', 'activity_type', 'description', 'duration_hours', 'rate_per_hour'],
    },
  },
  {
    name: 'create_note',
    description: 'Create a note on a case.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string' as const, description: 'UUID of the case' },
        content: { type: 'string' as const, description: 'Note content' },
        note_type: { type: 'string' as const, description: 'Type: general, medical_review, legal_analysis, communication, billing, other. Default: general' },
        title: { type: 'string' as const, description: 'Optional title for the note' },
        is_important: { type: 'boolean' as const, description: 'Flag as important. Default: false' },
      },
      required: ['case_id', 'content'],
    },
  },
  {
    name: 'sync_to_control_center',
    description: 'Push case data to the Ettinger Control Center. Syncs the case as a project, contacts as people, and milestones as tasks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string' as const, description: 'UUID of the case to sync. Omit to sync all active cases.' },
      },
      required: [],
    },
  },
]

const SYSTEM_PROMPT = `You are an AI assistant embedded in the Expert Witness Practice Manager for Dr. Mark Ettinger. You have tools to read and write to the practice database.

When the user asks you to do something, use your tools to accomplish it. Always:
1. Confirm before any DELETE operation (refuse to delete without explicit confirmation)
2. Use query_database for any read operations or lookups
3. Provide clear summaries of what you created or changed
4. If creating a case and the user mentions an attorney, create the contact too and link them
5. When creating time entries, if the user doesn't specify a rate, query billing_rates to find the current rate for that activity type

Available case statuses: inquiry, pending, active, accepted, review, on_hold, closed, declined, withdrawn
Available priorities: urgent, high, normal, low
Available case types: medical_malpractice, personal_injury, wrongful_death, product_liability, other
Available sides: plaintiff, defense

When querying, the main tables and their key columns are:
- cases (id, case_number, case_name, case_type, status, priority, side, specialty_area, date_of_incident, date_received, jurisdiction_state, jurisdiction_court, patient_name, patient_dob, brief_summary, key_issues, preliminary_opinion, opinion_strength, opinion_summary, deadline_next, deadline_description, deadline_report, deadline_deposition, deadline_trial, retainer_required, retainer_amount, retainer_received, estimated_hours, actual_hours, total_billed, total_paid, balance_due, outstanding_balance, notes, referral_source, tags, is_archived, created_at, updated_at)
- contacts (id, contact_type, first_name, last_name, organization_name, title, email, phone_primary, phone_secondary, fax, address_street, address_city, address_state, address_zip, bar_number, specialty, preferred_communication, notes, is_active)
- case_contacts (id, case_id, contact_id, role, is_primary, notes)
- case_milestones (id, case_id, milestone_type, milestone_name, description, target_date, actual_date, is_completed, status, sort_order, reminder_sent, reminder_days_before, notes)
- time_entries (id, case_id, activity_type, description, date, duration_hours, rate_per_hour, amount, is_billable, is_billed, invoice_id, status, billing_rate_id, internal_notes)
- invoices (id, case_id, invoice_number, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due, bill_to_contact_id, bill_to_name, bill_to_organization, payment_terms, notes)
- documents (id, case_id, title, document_type)
- case_notes (id, case_id, note_type, title, content, content_format, is_pinned, is_important, ai_generated, tags)
- billing_rates (id, activity_type, description, rate_per_hour, is_active, effective_date, end_date, notes)`

async function handleToolCall(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const supabase = getSupabaseAdmin()

  switch (toolName) {
    case 'query_database': {
      const query = (input.query as string || '').trim()
      const upperQuery = query.toUpperCase()
      if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
        return { error: 'Only SELECT and WITH queries are allowed for safety.' }
      }
      const { data, error } = await supabase.rpc('execute_readonly_query', {
        query_text: query,
      })
      if (error) {
        return { error: `Query failed: ${error.message}` }
      }
      return data
    }

    case 'update_case': {
      const { data, error } = await supabase
        .from('cases')
        .update(input.updates as Record<string, unknown>)
        .eq('id', input.case_id as string)
        .select()
        .single()

      if (error) return { error: error.message }

      // Log to audit
      await supabase.from('audit_log').insert({
        table_name: 'cases',
        record_id: input.case_id,
        action: 'ai_update',
        new_values: input.updates,
      }).then(() => {}) // fire-and-forget, don't block on audit

      return data
    }

    case 'create_case': {
      // Generate case number
      const { count } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })

      const caseNumber = `EW-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

      const insertData: Record<string, unknown> = {
        case_number: caseNumber,
        case_name: input.case_name,
        case_type: input.case_type || 'other',
        status: input.status || 'inquiry',
        priority: input.priority || 'normal',
      }

      // Optional fields
      if (input.side !== undefined) insertData.side = input.side
      if (input.specialty_area) insertData.specialty_area = input.specialty_area
      if (input.brief_summary) insertData.brief_summary = input.brief_summary
      if (input.notes) insertData.notes = input.notes
      if (input.referral_source) insertData.referral_source = input.referral_source

      const { data, error } = await supabase
        .from('cases')
        .insert(insertData)
        .select()
        .single()

      if (error) return { error: error.message }

      await supabase.from('audit_log').insert({
        table_name: 'cases',
        record_id: data.id,
        action: 'ai_create',
        new_values: { case_name: input.case_name },
      }).then(() => {})

      return data
    }

    case 'create_contact': {
      const insertData: Record<string, unknown> = {
        first_name: input.first_name,
        last_name: input.last_name,
        contact_type: input.contact_type || 'other',
      }

      // Optional fields
      if (input.email) insertData.email = input.email
      if (input.phone_primary) insertData.phone_primary = input.phone_primary
      if (input.organization_name) insertData.organization_name = input.organization_name
      if (input.title) insertData.title = input.title
      if (input.specialty) insertData.specialty = input.specialty
      if (input.bar_number) insertData.bar_number = input.bar_number
      if (input.address_street) insertData.address_street = input.address_street
      if (input.address_city) insertData.address_city = input.address_city
      if (input.address_state) insertData.address_state = input.address_state
      if (input.address_zip) insertData.address_zip = input.address_zip
      if (input.notes) insertData.notes = input.notes

      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single()

      if (error) return { error: error.message }

      await supabase.from('audit_log').insert({
        table_name: 'contacts',
        record_id: data.id,
        action: 'ai_create',
        new_values: { name: `${input.first_name} ${input.last_name}` },
      }).then(() => {})

      return data
    }

    case 'link_contact_to_case': {
      const { data, error } = await supabase
        .from('case_contacts')
        .insert({
          case_id: input.case_id,
          contact_id: input.contact_id,
          role: input.role || 'other',
          is_primary: input.is_primary ?? false,
        })
        .select()
        .single()

      if (error) return { error: error.message }
      return data
    }

    case 'create_milestone': {
      // Get the current max sort_order for this case
      const { data: existing } = await supabase
        .from('case_milestones')
        .select('sort_order')
        .eq('case_id', input.case_id as string)
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0

      const { data, error } = await supabase
        .from('case_milestones')
        .insert({
          case_id: input.case_id,
          milestone_name: input.milestone_name,
          target_date: input.target_date || null,
          milestone_type: input.milestone_type || 'other',
          description: input.description || null,
          status: input.status || 'pending',
          is_completed: false,
          sort_order: nextSortOrder,
          reminder_sent: false,
        })
        .select()
        .single()

      if (error) return { error: error.message }

      await supabase.from('audit_log').insert({
        table_name: 'case_milestones',
        record_id: data.id,
        action: 'ai_create',
        new_values: { milestone_name: input.milestone_name, case_id: input.case_id },
      }).then(() => {})

      return data
    }

    case 'create_time_entry': {
      const amount = (input.duration_hours as number) * (input.rate_per_hour as number)

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          case_id: input.case_id,
          activity_type: input.activity_type,
          description: input.description,
          duration_hours: input.duration_hours,
          rate_per_hour: input.rate_per_hour,
          amount,
          date: input.date || new Date().toISOString().split('T')[0],
          is_billable: input.is_billable ?? true,
          is_billed: false,
          status: 'draft',
        })
        .select()
        .single()

      if (error) return { error: error.message }

      await supabase.from('audit_log').insert({
        table_name: 'time_entries',
        record_id: data.id,
        action: 'ai_create',
        new_values: { description: input.description, case_id: input.case_id, amount },
      }).then(() => {})

      return data
    }

    case 'create_note': {
      const { data, error } = await supabase
        .from('case_notes')
        .insert({
          case_id: input.case_id,
          content: input.content,
          note_type: input.note_type || 'general',
          title: input.title || null,
          content_format: 'plain_text',
          is_important: input.is_important ?? false,
          ai_generated: true,
        })
        .select()
        .single()

      if (error) return { error: error.message }

      await supabase.from('audit_log').insert({
        table_name: 'case_notes',
        record_id: data.id,
        action: 'ai_create',
        new_values: { note_type: input.note_type || 'general', case_id: input.case_id },
      }).then(() => {})

      return data
    }

    case 'sync_to_control_center': {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')

      const res = await fetch(`${baseUrl}/api/control-center/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: input.case_id || undefined }),
      })

      return await res.json()
    }

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const { messages } = await request.json()

    let currentMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }))

    const MAX_ITERATIONS = 10
    let iterations = 0

    // Agentic loop: keep calling Claude until we get a final text response
    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: currentMessages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { error: `Anthropic API error: ${response.status} - ${errorText}` },
          { status: response.status }
        )
      }

      const result = await response.json()

      // Check if Claude wants to use tools
      if (result.stop_reason === 'tool_use') {
        // Add Claude's response to messages
        currentMessages.push({
          role: 'assistant',
          content: result.content,
        })

        // Process each tool use
        const toolResults = []
        for (const block of result.content) {
          if (block.type === 'tool_use') {
            const toolResult = await handleToolCall(block.name, block.input)
            toolResults.push({
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(toolResult),
            })
          }
        }

        // Add tool results to messages
        currentMessages.push({
          role: 'user',
          content: toolResults,
        })

        continue // Loop back to call Claude with tool results
      }

      // Final response (no more tool calls)
      const textContent = result.content
        .filter((block: { type: string }) => block.type === 'text')
        .map((block: { text: string }) => block.text)
        .join('\n')

      return NextResponse.json({
        response: textContent,
        iterations,
      })
    }

    return NextResponse.json({
      response: 'Reached maximum tool-use iterations. The operation may be partially complete.',
      iterations: MAX_ITERATIONS,
    })
  } catch (error) {
    console.error('AI command error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
