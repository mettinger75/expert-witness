import { supabase } from '@/lib/supabase'
import type { ContractRow, ContractInsert, ContractUpdate } from '@/types/database.types'

export const contractsService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ContractRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as ContractRow
  },

  async create(input: ContractInsert) {
    const { data, error } = await supabase
      .from('contracts')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as ContractRow
  },

  async update(id: string, input: ContractUpdate) {
    const { data, error } = await supabase
      .from('contracts')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ContractRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
