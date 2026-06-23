import { supabase } from '@/lib/supabase'
import type { DocumentRow, DocumentInsert, DocumentUpdate } from '@/types/database.types'

export interface DocumentFilters {
  category?: string
  folder_id?: string
  search?: string
}

// Column aliases: DB uses document_type/file_size_bytes/storage_path/document_date/is_key_document,
// but the app TypeScript types use category/file_size/file_path/date_of_document/is_exhibit.
const DOC_SELECT = '*, category:document_type, file_size:file_size_bytes, file_path:storage_path, date_of_document:document_date, is_exhibit:is_key_document'
const DOC_SELECT_WITH_CASE = `${DOC_SELECT}, cases!inner(case_name)`

export const documentsService = {
  async getAll(filters?: DocumentFilters) {
    let query = supabase
      .from('documents')
      .select(DOC_SELECT_WITH_CASE)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.category) query = query.eq('document_type', filters.category)
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
      .select(DOC_SELECT)
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.category) query = query.eq('document_type', filters.category)
    if (filters?.folder_id) query = query.eq('folder_id', filters.folder_id)
    if (filters?.search) query = query.ilike('file_name', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as DocumentRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('documents')
      .select(DOC_SELECT)
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
