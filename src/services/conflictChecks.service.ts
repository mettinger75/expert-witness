import { supabase } from '@/lib/supabase'
import type {
  ConflictCheckRow,
  ConflictCheckInsert,
  ConflictResolution,
} from '@/types/database.types'

export const conflictChecksService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('conflict_checks')
      .select('*')
      .eq('case_id', caseId)
      .order('checked_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ConflictCheckRow[]
  },

  async create(input: ConflictCheckInsert) {
    const { data, error } = await supabase
      .from('conflict_checks')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as ConflictCheckRow
  },

  async resolve(id: string, resolution: ConflictResolution, notes: string) {
    const { data, error } = await supabase
      .from('conflict_checks')
      .update({
        resolution,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ConflictCheckRow
  },
}
