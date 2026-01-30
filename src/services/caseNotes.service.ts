import { supabase } from '@/lib/supabase'
import type { CaseNoteRow, CaseNoteInsert, CaseNoteUpdate } from '@/types/database.types'

export const caseNotesService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('case_notes')
      .select('*')
      .eq('case_id', caseId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as CaseNoteRow[]
  },

  async create(input: CaseNoteInsert) {
    const { data, error } = await supabase
      .from('case_notes')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as CaseNoteRow
  },

  async update(id: string, input: CaseNoteUpdate) {
    const { data, error } = await supabase
      .from('case_notes')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CaseNoteRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('case_notes')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async togglePin(id: string) {
    // Fetch current state
    const { data: current, error: fetchError } = await supabase
      .from('case_notes')
      .select('is_pinned')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    const { data, error } = await supabase
      .from('case_notes')
      .update({ is_pinned: !current.is_pinned })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CaseNoteRow
  },
}
