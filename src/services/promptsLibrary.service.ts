import { supabase } from '@/lib/supabase'
import type {
  AIPromptsLibraryRow,
  AIPromptsLibraryInsert,
  AIPromptsLibraryUpdate,
} from '@/types/database.types'

export interface PromptFilters {
  category?: string
}

export const promptsLibraryService = {
  async getAll(filters?: PromptFilters) {
    let query = supabase
      .from('ai_prompts_library')
      .select('*')
      .order('name', { ascending: true })

    if (filters?.category) query = query.eq('category', filters.category)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as AIPromptsLibraryRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('ai_prompts_library')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as AIPromptsLibraryRow
  },

  async create(input: AIPromptsLibraryInsert) {
    const { data, error } = await supabase
      .from('ai_prompts_library')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as AIPromptsLibraryRow
  },

  async update(id: string, input: AIPromptsLibraryUpdate) {
    const { data, error } = await supabase
      .from('ai_prompts_library')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as AIPromptsLibraryRow
  },
}
