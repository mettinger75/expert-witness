import { supabase } from '@/lib/supabase'
import type { ReportInsert, ReportUpdate } from '@/types/database.types'

export const reportsService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(input: ReportInsert) {
    const { data, error } = await supabase
      .from('reports')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: ReportUpdate) {
    const { data, error } = await supabase
      .from('reports')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Auto-create document record when report is finalized or sent
    if (data && (input.status === 'final' || input.status === 'sent')) {
      try {
        // Check if document already exists for this report
        const { data: existing } = await supabase
          .from('documents')
          .select('id')
          .eq('report_id', data.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from('documents').insert({
            case_id: data.case_id,
            file_name: `${data.report_name}.pdf`,
            original_file_name: `${data.report_name}.pdf`,
            file_path: `reports/${data.id}`,
            file_size: 0,
            mime_type: 'application/pdf',
            category: 'expert_report',
            description: `Generated report: ${data.report_name}`,
            report_id: data.id,
            review_status: 'reviewed',
            review_priority: 'normal',
            ocr_status: 'not_needed',
          })
        }
      } catch (docError) {
        // Log but don't fail the report update
        console.error('Failed to auto-create document for report:', docError)
      }
    }

    return data
  },

  async delete(id: string) {
    // First get the case_id so we can invalidate the right query
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, case_id')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
    if (error) throw error
    return report
  },

  async updateSections(id: string, sectionsData: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('reports')
      .update({
        sections_data: sectionsData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getTemplates() {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async getTemplateWithSections(templateId: string) {
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    if (templateError) throw templateError

    const { data: mappings, error: mappingError } = await supabase
      .from('template_section_mappings')
      .select('*, section:template_sections(*)')
      .eq('template_id', templateId)
      .eq('is_included', true)
      .order('sort_order', { ascending: true })
    if (mappingError) throw mappingError

    return { template, sections: mappings ?? [] }
  },
}
