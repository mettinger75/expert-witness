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
    // 1. Un-bill linked time entries
    await supabase
      .from('time_entries')
      .update({ is_billed: false, invoice_id: null })
      .eq('invoice_id', id)

    // 2. Un-link standalone charges (non-time line items) — keep rows but detach from invoice
    await supabase
      .from('invoice_line_items')
      .update({ invoice_id: null, is_billed: false })
      .eq('invoice_id', id)
      .not('time_entry_id', 'is', null)

    // 3. Delete time-entry-based line items (they were created during invoice generation)
    await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id)
      .is('time_entry_id', null)
      // Actually, delete all remaining line items that still have this invoice_id
      // (the standalone ones were already detached in step 2)

    // Clean up: delete any remaining line items still attached
    await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id)

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
      activity_type: 'time' as const,
      description: entry.description,
      quantity: entry.duration_hours,
      unit_price: entry.rate_per_hour,
      amount: entry.amount,
      line_number: index,
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

  /**
   * Generate an invoice from all unbilled items (time entries + standalone charges)
   */
  async generateFromUnbilledItems(
    caseId: string,
    options: {
      timeEntryIds: string[]
      chargeIds: string[]
      billToContactId?: string
      billToName?: string
      billToOrganization?: string
      billToAddress?: string
      billToEmail?: string
      templateId?: string
      dueDate?: string
      paymentTerms?: number
      taxRate?: number
      paymentInstructions?: string
      notes?: string
    }
  ) {
    // Fetch selected time entries
    let entries: { id: string; description: string; duration_hours: number; rate_per_hour: number; amount: number }[] = []
    if (options.timeEntryIds.length > 0) {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, description, duration_hours, rate_per_hour, amount')
        .in('id', options.timeEntryIds)
      if (error) throw error
      entries = data ?? []
    }

    // Fetch selected standalone charges
    let charges: { id: string; description: string; quantity: number; unit_price: number; amount: number; activity_type: string }[] = []
    if (options.chargeIds.length > 0) {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('id, description, quantity, unit_price, amount, activity_type')
        .in('id', options.chargeIds)
      if (error) throw error
      charges = data ?? []
    }

    // Calculate totals
    const timeSubtotal = entries.reduce((sum, e) => sum + (e.amount || 0), 0)
    const chargeSubtotal = charges.reduce((sum, c) => sum + (c.amount || 0), 0)
    const subtotal = timeSubtotal + chargeSubtotal
    const taxRate = options.taxRate ?? 0
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount

    const now = new Date()
    const paymentTerms = options.paymentTerms ?? 30
    const dueDate = options.dueDate ?? new Date(now.getTime() + paymentTerms * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const yr = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const rand = String(Math.floor(1000 + Math.random() * 9000))
    const invoiceNumber = `INV-${yr}${mo}-${rand}`

    // Create invoice
    const { data: invoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        case_id: caseId,
        invoice_number: invoiceNumber,
        invoice_date: now.toISOString().split('T')[0],
        due_date: dueDate,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        balance_due: totalAmount,
        bill_to_contact_id: options.billToContactId ?? null,
        bill_to_name: options.billToName ?? null,
        bill_to_organization: options.billToOrganization ?? null,
        bill_to_address: options.billToAddress ?? null,
        bill_to_email: options.billToEmail ?? null,
        template_id: options.templateId ?? null,
        payment_terms: paymentTerms,
        payment_instructions: options.paymentInstructions ?? null,
        notes: options.notes ?? null,
      })
      .select()
      .single()
    if (createError) throw createError

    // Create line items for time entries
    let sortIndex = 0
    if (entries.length > 0) {
      const timeLineItems = entries.map((entry) => ({
        invoice_id: invoice.id,
        case_id: caseId,
        time_entry_id: entry.id,
        activity_type: 'time' as const,
        description: entry.description,
        quantity: entry.duration_hours,
        unit_price: entry.rate_per_hour,
        amount: entry.amount,
        line_number: sortIndex++,
        is_billed: true,
      }))
      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .insert(timeLineItems)
      if (lineError) throw lineError

      // Mark time entries as billed
      await supabase
        .from('time_entries')
        .update({ is_billed: true, invoice_id: invoice.id })
        .in('id', options.timeEntryIds)
    }

    // Link standalone charges to this invoice
    if (options.chargeIds.length > 0) {
      for (const chargeId of options.chargeIds) {
        await supabase
          .from('invoice_line_items')
          .update({
            invoice_id: invoice.id,
            is_billed: true,
            line_number: sortIndex++,
          })
          .eq('id', chargeId)
      }
    }

    return invoice as InvoiceRow
  },

  /**
   * Add unbilled items to an existing unpaid invoice
   */
  async addItemsToInvoice(
    invoiceId: string,
    timeEntryIds: string[],
    chargeIds: string[]
  ) {
    // Fetch the invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()
    if (invError || !invoice) throw new Error('Invoice not found')
    if (invoice.status === 'paid') throw new Error('Cannot add items to a paid invoice')

    // Get current max line_number
    const { data: existingItems } = await supabase
      .from('invoice_line_items')
      .select('line_number')
      .eq('invoice_id', invoiceId)
      .order('line_number', { ascending: false })
      .limit(1)
    let sortIndex = (existingItems?.[0]?.line_number ?? -1) + 1

    let addedAmount = 0

    // Add time entries
    if (timeEntryIds.length > 0) {
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('*')
        .in('id', timeEntryIds)
      if (error) throw error

      const lineItems = (entries ?? []).map((entry) => ({
        invoice_id: invoiceId,
        case_id: invoice.case_id,
        time_entry_id: entry.id,
        activity_type: 'time' as const,
        description: entry.description,
        quantity: entry.duration_hours,
        unit_price: entry.rate_per_hour,
        amount: entry.amount,
        line_number: sortIndex++,
        is_billed: true,
      }))

      if (lineItems.length > 0) {
        await supabase.from('invoice_line_items').insert(lineItems)
        addedAmount += lineItems.reduce((sum, li) => sum + li.amount, 0)
      }

      await supabase
        .from('time_entries')
        .update({ is_billed: true, invoice_id: invoiceId })
        .in('id', timeEntryIds)
    }

    // Link standalone charges
    if (chargeIds.length > 0) {
      const { data: charges } = await supabase
        .from('invoice_line_items')
        .select('id, amount')
        .in('id', chargeIds)

      for (const charge of charges ?? []) {
        await supabase
          .from('invoice_line_items')
          .update({
            invoice_id: invoiceId,
            is_billed: true,
            line_number: sortIndex++,
          })
          .eq('id', charge.id)
        addedAmount += charge.amount
      }
    }

    // Recalculate invoice totals
    const newSubtotal = (invoice.subtotal || 0) + addedAmount
    const taxRate = invoice.tax_rate ?? 0
    const newTaxAmount = newSubtotal * (taxRate / 100)
    const newTotal = newSubtotal + newTaxAmount
    const newBalance = newTotal - (invoice.amount_paid || 0)

    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        subtotal: newSubtotal,
        tax_amount: newTaxAmount,
        total_amount: newTotal,
        balance_due: newBalance,
      })
      .eq('id', invoiceId)
      .select()
      .single()
    if (updateError) throw updateError

    return updated as InvoiceRow
  },
}
