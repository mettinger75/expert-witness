import { supabase } from '@/lib/supabase'
import type { DepositionRow, DepositionInsert, DepositionUpdate } from '@/types/database.types'

export const depositionsService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('depositions')
      .select('*')
      .eq('case_id', caseId)
      .order('deposition_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as DepositionRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('depositions')
      .select('*, deposition_excerpts(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as DepositionRow & { deposition_excerpts: unknown[] }
  },

  async create(input: DepositionInsert) {
    const { data, error } = await supabase
      .from('depositions')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as DepositionRow
  },

  async update(id: string, input: DepositionUpdate) {
    const { data, error } = await supabase
      .from('depositions')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DepositionRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('depositions')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
