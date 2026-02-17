import { supabase } from '@/lib/supabase'
import type { DocumentRow, DocumentInsert, DocumentUpdate } from '@/types/database.types'

export interface DocumentFilters {
  category?: string
  folder_id?: string
  search?: string
}

export const documentsService = {
  async getAll(filters?: DocumentFilters) {
    let query = supabase
      .from('documents')
      .select('*, cases!inner(case_name)')
      .order('created_at', { ascending: false })

    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.search) {
      query = query.or(
        `file_name.ilike.%${filters.search}%,original_file_name.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as (DocumentRow & { cases: { case_name: string } })[]
  },

  async getByCaseId(caseId: string, filters?: DocumentFilters) {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.folder_id) query = query.eq('folder_id', filters.folder_id)
    if (filters?.search) query = query.ilike('file_name', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as DocumentRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as DocumentRow
  },

  async create(input: DocumentInsert) {
    const { data, error } = await supabase
      .from('documents')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as DocumentRow
  },

  async update(id: string, input: DocumentUpdate) {
    const { data, error } = await supabase
      .from('documents')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DocumentRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async upload(caseId: string, file: File) {
    const path = `cases/${caseId}/documents/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('case-documents')
      .upload(path, file)
    if (uploadError) throw uploadError
    return path
  },

  async getDownloadUrl(path: string) {
    const { data, error } = await supabase.storage
      .from('case-documents')
      .createSignedUrl(path, 3600)
    if (error) throw error
    return data.signedUrl
  },
}
