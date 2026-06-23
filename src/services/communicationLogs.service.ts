import { supabase } from '@/lib/supabase'
import type {
  CommunicationLogRow,
  CommunicationLogInsert,
  CommunicationLogUpdate,
} from '@/types/database.types'

export const communicationLogsService = {
  /** Get all communication logs across all cases with case name joined */
  async getAll(filters?: { direction?: string; search?: string; communicationType?: string }) {
    let query = supabase
      .from('communication_logs')
      .select('*, cases(case_name)')
      .order('communication_date', { ascending: false })
      .limit(200)

    if (filters?.direction) {
      query = query.eq('direction', filters.direction)
    }
    if (filters?.communicationType) {
      query = query.eq('communication_type', filters.communicationType)
    }
    if (filters?.search) {
      query = query.or(`subject.ilike.%${filters.search}%,summary.ilike.%${filters.search}%,from_name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as (CommunicationLogRow & { cases: { case_name: string } | null })[]
  },

  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('communication_logs')
      .select('*')
      .eq('case_id', caseId)
      .order('communication_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as CommunicationLogRow[]
  },

  async getByContactId(contactId: string) {
    const { data, error } = await supabase
      .from('communication_logs')
      .select('*')
      .eq('contact_id', contactId)
      .order('communication_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as CommunicationLogRow[]
  },

  /** Get all unassigned emails (inbox) */
  async getUnassigned() {
    const { data, error } = await supabase
      .from('communication_logs')
      .select('*')
      .is('case_id', null)
      .order('communication_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as CommunicationLogRow[]
  },

  async create(input: CommunicationLogInsert) {
    const { data, error } = await supabase
      .from('communication_logs')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as CommunicationLogRow
  },

  async update(id: string, input: CommunicationLogUpdate) {
    const { data, error } = await supabase
      .from('communication_logs')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CommunicationLogRow
  },

  /** Assign an inbox email to a case */
  async assignToCase(emailId: string, caseId: string) {
    const { data, error } = await supabase
      .from('communication_logs')
      .update({ case_id: caseId })
      .eq('id', emailId)
      .select()
      .single()
    if (error) throw error
    return data as CommunicationLogRow
  },

  /** Delete an inbox email */
  async delete(id: string) {
    const { error } = await supabase
      .from('communication_logs')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
