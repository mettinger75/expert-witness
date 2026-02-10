import { supabase } from '@/lib/supabase'
import type { InvoiceRow, InvoiceInsert, InvoiceUpdate } from '@/types/database.types'

export interface InvoiceFilters {
  status?: string
  case_id?: string
}

export const invoicesService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('case_id', caseId)
      .order('invoice_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as (InvoiceRow & { invoice_line_items: unknown[] })[]
  },

  async getByContactId(contactId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('bill_to_contact_id', contactId)
      .order('invoice_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as (InvoiceRow & { invoice_line_items: unknown[] })[]
  },

  async getAll(filters?: InvoiceFilters) {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.case_id) query = query.eq('case_id', filters.case_id)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as InvoiceRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*), payments(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as InvoiceRow & { invoice_line_items: unknown[]; payments: unknown[] }
  },

  async create(input: InvoiceInsert) {
    const { data, error } = await supabase
      .from('invoices')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as InvoiceRow
  },

  async update(id: string, input: InvoiceUpdate) {
    const { data, error } = await supabase
      .from('invoices')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as InvoiceRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async generateFromTimeEntries(caseId: string, timeEntryIds: string[]) {
    // Fetch the time entries to sum up
    const { data: entries, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .in('id', timeEntryIds)
    if (fetchError) throw fetchError

    const subtotal = (entries ?? []).reduce((sum, e) => sum + (e.amount || 0), 0)
    const invoiceNumber = `INV-${Date.now()}`

    // Create the invoice
    const { data: invoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        case_id: caseId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal,
        total_amount: subtotal,
        balance_due: subtotal,
      })
      .select()
      .single()
    if (createError) throw createError

    // Create line items for each time entry
    const lineItems = (entries ?? []).map((entry, index) => ({
      invoice_id: invoice.id,
      time_entry_id: entry.id,
      line_type: 'time' as const,
      description: entry.description,
      quantity: entry.duration_hours,
      unit_price: entry.rate_per_hour,
      amount: entry.amount,
      sort_order: index,
    }))

    if (lineItems.length > 0) {
      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems)
      if (lineError) throw lineError
    }

    // Mark time entries as billed
    const { error: updateError } = await supabase
      .from('time_entries')
      .update({ is_billed: true, invoice_id: invoice.id })
      .in('id', timeEntryIds)
    if (updateError) throw updateError

    return invoice as InvoiceRow
  },
}
