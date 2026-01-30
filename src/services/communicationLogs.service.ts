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
}
