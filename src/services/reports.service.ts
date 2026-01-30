import { supabase } from '@/lib/supabase'
import type { ReportRow, ReportInsert, ReportUpdate } from '@/types/database.types'

export const reportsService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ReportRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as ReportRow
  },

  async create(input: ReportInsert) {
    const { data, error } = await supabase
      .from('reports')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as ReportRow
  },

  async update(id: string, input: ReportUpdate) {
    const { data, error } = await supabase
      .from('reports')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ReportRow
  },

  async updateContent(id: string, contentMarkdown: string) {
    const { data, error } = await supabase
      .from('reports')
      .update({ full_content: contentMarkdown })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ReportRow
  },
}
