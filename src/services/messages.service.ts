import { supabase } from '@/lib/supabase'
import type { AIMessageRow, AIMessageInsert } from '@/types/database.types'

export const messagesService = {
  async getByConversationId(conversationId: string) {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as AIMessageRow[]
  },

  async create(input: AIMessageInsert) {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as AIMessageRow
  },
}
