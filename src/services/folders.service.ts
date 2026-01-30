import { supabase } from '@/lib/supabase'
import type { DocumentFolderRow, DocumentFolderInsert, DocumentFolderUpdate } from '@/types/database.types'

export const foldersService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []) as DocumentFolderRow[]
  },

  async create(input: DocumentFolderInsert) {
    const { data, error } = await supabase
      .from('document_folders')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as DocumentFolderRow
  },

  async update(id: string, input: DocumentFolderUpdate) {
    const { data, error } = await supabase
      .from('document_folders')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DocumentFolderRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
