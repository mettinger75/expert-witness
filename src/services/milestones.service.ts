import { supabase } from '@/lib/supabase'
import type { CaseMilestoneRow, CaseMilestoneInsert, CaseMilestoneUpdate } from '@/types/database.types'

export const milestonesService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('case_milestones')
      .select('*')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []) as CaseMilestoneRow[]
  },

  async create(input: CaseMilestoneInsert) {
    const { data, error } = await supabase
      .from('case_milestones')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as CaseMilestoneRow
  },

  async update(id: string, input: CaseMilestoneUpdate) {
    const { data, error } = await supabase
      .from('case_milestones')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CaseMilestoneRow
  },

  async toggleComplete(id: string) {
    // Fetch current state
    const { data: current, error: fetchError } = await supabase
      .from('case_milestones')
      .select('is_completed')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('case_milestones')
      .update({
        is_completed: !current.is_completed,
        completed_date: !current.is_completed ? now : null,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CaseMilestoneRow
  },
}
