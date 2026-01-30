import { supabase } from '@/lib/supabase'
import type { AIConversationRow, AIConversationInsert, AIConversationUpdate } from '@/types/database.types'

export const conversationsService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('case_id', caseId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AIConversationRow[]
  },

  async getAll() {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AIConversationRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as AIConversationRow
  },

  async create(input: AIConversationInsert) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as AIConversationRow
  },

  async update(id: string, input: AIConversationUpdate) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as AIConversationRow
  },
}
