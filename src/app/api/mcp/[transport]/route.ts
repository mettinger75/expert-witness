import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const handler = createMcpHandler(
  (server) => {
    // ─── list_cases ───
    server.registerTool(
      'list_cases',
      {
        title: 'List Cases',
        description:
          'List all expert witness cases with status, side, attorney, and case number. Optionally filter by status.',
        inputSchema: {
          status: z
            .string()
            .optional()
            .describe(
              'Filter by status: inquiry, accepted, active, opinion_issued, deposition_scheduled, deposition_complete, trial_scheduled, trial_complete, closed, declined, withdrawn'
            ),
        },
      },
      async ({ status }) => {
        const supabase = getSupabaseAdmin()
        let query = supabase
          .from('cases')
          .select(
            'id, case_number, case_name, status, priority, side, specialty_area, case_type, brief_summary, date_received, deadline_next'
          )
          .order('created_at', { ascending: false })

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        }
      }
    )

    // ─── search_cases ───
    server.registerTool(
      'search_cases',
      {
        title: 'Search Cases',
        description:
          'Search expert witness cases by name, party name, or keyword. Returns matching cases with details.',
        inputSchema: {
          query: z.string().describe('Search term — matches case name, patient name, or summary'),
        },
      },
      async ({ query: searchQuery }) => {
        const supabase = getSupabaseAdmin()
        const term = `%${searchQuery}%`
        const { data, error } = await supabase
          .from('cases')
          .select(
            'id, case_number, case_name, status, priority, side, specialty_area, brief_summary, patient_name'
          )
          .or(`case_name.ilike.${term},patient_name.ilike.${term},brief_summary.ilike.${term}`)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
      }
    )

    // ─── get_case_details ───
    server.registerTool(
      'get_case_details',
      {
        title: 'Get Case Details',
        description:
          'Get full details for a specific case including linked contacts, recent notes, and upcoming milestones.',
        inputSchema: {
          case_id: z.string().describe('UUID of the case'),
        },
      },
      async ({ case_id }) => {
        const supabase = getSupabaseAdmin()

        const [caseRes, contactsRes, notesRes, milestonesRes] = await Promise.all([
          supabase.from('cases').select('*').eq('id', case_id).single(),
          supabase
            .from('case_contacts')
            .select('role, is_primary, contacts(first_name, last_name, email, phone_primary, organization_name)')
            .eq('case_id', case_id),
          supabase
            .from('case_notes')
            .select('id, note_type, title, content, created_at')
            .eq('case_id', case_id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('case_milestones')
            .select('milestone_name, target_date, status, milestone_type')
            .eq('case_id', case_id)
            .order('target_date', { ascending: true })
            .limit(10),
        ])

        if (caseRes.error) {
          return { content: [{ type: 'text' as const, text: `Error: ${caseRes.error.message}` }] }
        }

        const result = {
          case: caseRes.data,
          contacts: contactsRes.data || [],
          recent_notes: notesRes.data || [],
          milestones: milestonesRes.data || [],
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )

    // ─── save_email_to_case ───
    server.registerTool(
      'save_email_to_case',
      {
        title: 'Save Email to Case',
        description:
          'Save an email to a case\'s inbox for review. The email will appear in the case\'s Emails tab under the Inbox section.',
        inputSchema: {
          case_id: z.string().describe('UUID of the case to file the email to'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Email body content'),
          sender: z.string().optional().describe('Sender display name'),
          sender_email: z.string().optional().describe('Sender email address'),
          date: z.string().optional().describe('Date of the email in ISO format'),
        },
      },
      async ({ case_id, subject, body, sender, sender_email, date }) => {
        const supabase = getSupabaseAdmin()

        const summary = body.length > 200 ? body.slice(0, 200) + '...' : body

        const { data, error } = await supabase
          .from('communication_logs')
          .insert({
            case_id,
            communication_type: 'email_received',
            direction: 'inbound',
            status: 'completed',
            subject,
            summary,
            detailed_notes: body,
            from_name: sender || null,
            from_email: sender_email || null,
            communication_date: date || new Date().toISOString(),
            follow_up_required: true,
            is_billable: false,
          })
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
        }

        await supabase
          .from('audit_log')
          .insert({
            table_name: 'communication_logs',
            record_id: data.id,
            action: 'mcp_create',
            new_values: { communication_type: 'email_received', case_id, subject },
          })
          .then(() => {})

        return {
          content: [
            {
              type: 'text' as const,
              text: `Email "${subject}" saved to case inbox. Communication log ID: ${data.id}`,
            },
          ],
        }
      }
    )

    // ─── add_case_note ───
    server.registerTool(
      'add_case_note',
      {
        title: 'Add Case Note',
        description: 'Add a note to an expert witness case.',
        inputSchema: {
          case_id: z.string().describe('UUID of the case'),
          content: z.string().describe('Note content'),
          note_type: z
            .string()
            .optional()
            .describe(
              'Type: general, medical_analysis, legal_analysis, strategy, research, meeting_notes, phone_notes, client_communication, other'
            ),
          title: z.string().optional().describe('Optional title'),
        },
      },
      async ({ case_id, content, note_type, title }) => {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
          .from('case_notes')
          .insert({
            case_id,
            content,
            note_type: note_type || 'general',
            title: title || null,
            content_format: 'plain_text',
            ai_generated: false,
            is_important: false,
          })
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
        }

        await supabase
          .from('audit_log')
          .insert({
            table_name: 'case_notes',
            record_id: data.id,
            action: 'mcp_create',
            new_values: { note_type: note_type || 'general', case_id },
          })
          .then(() => {})

        return {
          content: [{ type: 'text' as const, text: `Note added. ID: ${data.id}` }],
        }
      }
    )

    // ─── list_contacts ───
    server.registerTool(
      'list_contacts',
      {
        title: 'List Contacts',
        description:
          'List contacts (attorneys, experts, providers). Optionally filter by a specific case to see linked contacts.',
        inputSchema: {
          case_id: z.string().optional().describe('Optional case UUID to list only contacts linked to that case'),
        },
      },
      async ({ case_id }) => {
        const supabase = getSupabaseAdmin()

        if (case_id) {
          const { data, error } = await supabase
            .from('case_contacts')
            .select(
              'role, is_primary, contacts(id, first_name, last_name, email, phone_primary, organization_name, contact_type)'
            )
            .eq('case_id', case_id)

          if (error) {
            return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
        }

        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone_primary, organization_name, contact_type')
          .eq('is_active', true)
          .order('last_name')

        if (error) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
      }
    )

    // ─── create_milestone ───
    server.registerTool(
      'create_milestone',
      {
        title: 'Create Milestone',
        description: 'Add a deadline or milestone to an expert witness case.',
        inputSchema: {
          case_id: z.string().describe('UUID of the case'),
          milestone_name: z.string().describe('Name of the milestone or deadline'),
          target_date: z.string().optional().describe('Target date in YYYY-MM-DD format'),
          milestone_type: z
            .string()
            .optional()
            .describe(
              'Type: trial_date_set, deposition, report_due, records_review, filing_deadline, discovery, mediation, other'
            ),
          description: z.string().optional(),
        },
      },
      async ({ case_id, milestone_name, target_date, milestone_type, description }) => {
        const supabase = getSupabaseAdmin()

        const { data: existing } = await supabase
          .from('case_milestones')
          .select('sort_order')
          .eq('case_id', case_id)
          .order('sort_order', { ascending: false })
          .limit(1)

        const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0

        const { data, error } = await supabase
          .from('case_milestones')
          .insert({
            case_id,
            milestone_name,
            target_date: target_date || null,
            milestone_type: milestone_type || 'other',
            description: description || null,
            status: 'pending',
            is_completed: false,
            sort_order: nextSortOrder,
            reminder_sent: false,
          })
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
        }

        await supabase
          .from('audit_log')
          .insert({
            table_name: 'case_milestones',
            record_id: data.id,
            action: 'mcp_create',
            new_values: { milestone_name, case_id },
          })
          .then(() => {})

        return {
          content: [
            {
              type: 'text' as const,
              text: `Milestone "${milestone_name}" added${target_date ? ` (due ${target_date})` : ''}. ID: ${data.id}`,
            },
          ],
        }
      }
    )

    // ─── log_time ───
    server.registerTool(
      'log_time',
      {
        title: 'Log Time Entry',
        description: 'Log billable time worked on an expert witness case.',
        inputSchema: {
          case_id: z.string().describe('UUID of the case'),
          activity_type: z
            .string()
            .describe(
              'Type: record_review, report_writing, deposition, testimony, consultation, research, correspondence, travel, other'
            ),
          description: z.string().describe('Description of work performed'),
          duration_hours: z.number().describe('Hours worked (e.g. 1.5)'),
          rate_per_hour: z.number().describe('Hourly rate in dollars'),
          date: z.string().optional().describe('Date of work in YYYY-MM-DD format. Defaults to today.'),
        },
      },
      async ({ case_id, activity_type, description, duration_hours, rate_per_hour, date }) => {
        const supabase = getSupabaseAdmin()
        const amount = duration_hours * rate_per_hour

        const { data, error } = await supabase
          .from('time_entries')
          .insert({
            case_id,
            activity_type,
            description,
            duration_hours,
            rate_per_hour,
            amount,
            date: date || new Date().toISOString().split('T')[0],
            is_billable: true,
            is_billed: false,
            status: 'draft',
          })
          .select()
          .single()

        if (error) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] }
        }

        await supabase
          .from('audit_log')
          .insert({
            table_name: 'time_entries',
            record_id: data.id,
            action: 'mcp_create',
            new_values: { description, case_id, amount },
          })
          .then(() => {})

        return {
          content: [
            {
              type: 'text' as const,
              text: `Logged ${duration_hours}h of ${activity_type} at $${rate_per_hour}/hr ($${amount.toFixed(2)}) on ${date || 'today'}. ID: ${data.id}`,
            },
          ],
        }
      }
    )
  },
  {},
  {
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: true,
  }
)

export { handler as GET, handler as POST }
