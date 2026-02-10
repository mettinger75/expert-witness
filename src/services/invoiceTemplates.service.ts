import { supabase } from '@/lib/supabase'
import type { InvoiceTemplateRow, InvoiceTemplateInsert, InvoiceTemplateUpdate } from '@/types/database.types'

export const invoiceTemplatesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name', { ascending: true })
    if (error) throw error
    return (data ?? []) as InvoiceTemplateRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as InvoiceTemplateRow
  },

  async getDefault() {
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return (data ?? null) as InvoiceTemplateRow | null
  },

  async create(input: InvoiceTemplateInsert) {
    const { data, error } = await supabase
      .from('invoice_templates')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as InvoiceTemplateRow
  },

  async update(id: string, input: InvoiceTemplateUpdate) {
    const { data, error } = await supabase
      .from('invoice_templates')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as InvoiceTemplateRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('invoice_templates')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
