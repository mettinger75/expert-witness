import { supabase } from '@/lib/supabase'
import type { InvoiceLineItemRow, InvoiceLineItemInsert, InvoiceLineItemUpdate } from '@/types/database.types'
import type { LineItemType } from '@/types/enums'

export interface ChargeInput {
  case_id: string
  activity_type: LineItemType
  description: string
  quantity: number
  unit_price: number
}

export const chargesService = {
  /**
   * Get all unbilled standalone charges for a case
   * (invoice_line_items with no invoice_id and not billed)
   */
  async getUnbilled(caseId: string) {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('case_id', caseId)
      .is('invoice_id', null)
      .eq('is_billed', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as InvoiceLineItemRow[]
  },

  /**
   * Get all standalone charges for a case (including billed)
   */
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('case_id', caseId)
      .is('time_entry_id', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as InvoiceLineItemRow[]
  },

  /**
   * Create a standalone charge (not yet linked to an invoice)
   */
  async create(input: ChargeInput) {
    const amount = input.quantity * input.unit_price
    const { data, error } = await supabase
      .from('invoice_line_items')
      .insert({
        case_id: input.case_id,
        invoice_id: null,
        activity_type: input.activity_type,
        description: input.description,
        quantity: input.quantity,
        unit_price: input.unit_price,
        amount,
        is_billed: false,
        line_number: 0,
      } as InvoiceLineItemInsert)
      .select()
      .single()
    if (error) throw error
    return data as InvoiceLineItemRow
  },

  /**
   * Update an unbilled standalone charge
   */
  async update(id: string, input: Partial<ChargeInput>) {
    const updateData: InvoiceLineItemUpdate = {}
    if (input.activity_type) updateData.activity_type = input.activity_type
    if (input.description) updateData.description = input.description
    if (input.quantity !== undefined) updateData.quantity = input.quantity
    if (input.unit_price !== undefined) updateData.unit_price = input.unit_price
    if (input.quantity !== undefined || input.unit_price !== undefined) {
      // Recalculate amount - need to fetch current values for any missing field
      const { data: current } = await supabase
        .from('invoice_line_items')
        .select('quantity, unit_price')
        .eq('id', id)
        .single()
      const qty = input.quantity ?? current?.quantity ?? 0
      const price = input.unit_price ?? current?.unit_price ?? 0
      updateData.amount = qty * price
    }

    const { data, error } = await supabase
      .from('invoice_line_items')
      .update(updateData)
      .eq('id', id)
      .is('invoice_id', null) // Only update if unbilled
      .select()
      .single()
    if (error) throw error
    return data as InvoiceLineItemRow
  },

  /**
   * Delete an unbilled standalone charge
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('id', id)
      .is('invoice_id', null) // Only delete if not on an invoice
    if (error) throw error
  },
}
