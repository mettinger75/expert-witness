import { supabase } from '@/lib/supabase'
import type {
  DepositionExcerptRow,
  DepositionExcerptInsert,
  DepositionExcerptUpdate,
} from '@/types/database.types'

export const depositionExcerptsService = {
  async getByDepositionId(depositionId: string) {
    const { data, error } = await supabase
      .from('deposition_excerpts')
      .select('*')
      .eq('deposition_id', depositionId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []) as DepositionExcerptRow[]
  },

  async create(input: DepositionExcerptInsert) {
    const { data, error } = await supabase
      .from('deposition_excerpts')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as DepositionExcerptRow
  },

  async update(id: string, input: DepositionExcerptUpdate) {
    const { data, error } = await supabase
      .from('deposition_excerpts')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DepositionExcerptRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('deposition_excerpts')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
