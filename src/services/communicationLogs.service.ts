import { supabase } from '@/lib/supabase'
import type {
  CommunicationLogRow,
  CommunicationLogInsert,
  CommunicationLogUpdate,
} from '@/types/database.types'

export const communicationLogsService = {
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
