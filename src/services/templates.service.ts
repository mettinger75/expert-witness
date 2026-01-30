import { supabase } from '@/lib/supabase'
import type { ReportTemplateRow, ReportTemplateInsert, ReportTemplateUpdate } from '@/types/database.types'

export interface TemplateFilters {
  report_type?: string
}

export const templatesService = {
  async getAll(filters?: TemplateFilters) {
    let query = supabase
      .from('report_templates')
      .select('*')
      .order('name', { ascending: true })

    if (filters?.report_type) query = query.eq('report_type', filters.report_type)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as ReportTemplateRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*, template_section_mappings(*, template_sections(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as ReportTemplateRow & { template_section_mappings: unknown[] }
  },

  async create(input: ReportTemplateInsert) {
    const { data, error } = await supabase
      .from('report_templates')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as ReportTemplateRow
  },

  async update(id: string, input: ReportTemplateUpdate) {
    const { data, error } = await supabase
      .from('report_templates')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ReportTemplateRow
  },
}
