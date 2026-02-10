import { supabase } from '@/lib/supabase'
import type {
  DocumentAnnotationRow,
  DocumentAnnotationInsert,
  DocumentAnnotationUpdate,
} from '@/types/database.types'

export const annotationsService = {
  async getByDocumentId(documentId: string) {
    const { data, error } = await supabase
      .from('document_annotations')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as DocumentAnnotationRow[]
  },

  async getByCaseDocuments(caseId: string) {
    // Fetch all annotations for documents belonging to a case
    const { data, error } = await supabase
      .from('document_annotations')
      .select('*, documents!inner(case_id, file_name, original_file_name)')
      .eq('documents.case_id', caseId)
      .order('page_number', { ascending: true })
    if (error) throw error
    return (data ?? []) as (DocumentAnnotationRow & {
      documents: { case_id: string; file_name: string; original_file_name: string }
    })[]
  },

  async create(input: DocumentAnnotationInsert) {
    const { data, error } = await supabase
      .from('document_annotations')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as DocumentAnnotationRow
  },

  async update(id: string, input: DocumentAnnotationUpdate) {
    const { data, error } = await supabase
      .from('document_annotations')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DocumentAnnotationRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('document_annotations')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
