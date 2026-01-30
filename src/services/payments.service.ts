import { supabase } from '@/lib/supabase'
import type { PaymentRow, PaymentInsert } from '@/types/database.types'

export const paymentsService = {
  async getByInvoiceId(invoiceId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as PaymentRow[]
  },

  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('case_id', caseId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as PaymentRow[]
  },

  async create(input: PaymentInsert) {
    const { data, error } = await supabase
      .from('payments')
      .insert(input)
      .select()
      .single()
    if (error) throw error

    // Update invoice balance if payment is linked to an invoice
    if (input.invoice_id) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('amount_paid, total')
        .eq('id', input.invoice_id)
        .single()

      if (invoice) {
        const newAmountPaid = (invoice.amount_paid || 0) + input.amount
        const newBalance = (invoice.total || 0) - newAmountPaid
        await supabase
          .from('invoices')
          .update({
            amount_paid: newAmountPaid,
            balance_due: newBalance,
            status: newBalance <= 0 ? 'paid' : 'partial',
            paid_at: newBalance <= 0 ? new Date().toISOString() : null,
          })
          .eq('id', input.invoice_id)
      }
    }

    return data as PaymentRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
