import { supabase } from '@/lib/supabase'
import type { BillingRateRow, BillingRateInsert, BillingRateUpdate } from '@/types/database.types'

export const billingRatesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('billing_rates')
      .select('*')
      .order('activity_type', { ascending: true })
    if (error) throw error
    return (data ?? []) as BillingRateRow[]
  },

  async getActive() {
    const { data, error } = await supabase
      .from('billing_rates')
      .select('*')
      .is('end_date', null)
      .order('activity_type', { ascending: true })
    if (error) throw error
    return (data ?? []) as BillingRateRow[]
  },

  async getRateForActivity(activityType: string) {
    const { data, error } = await supabase
      .from('billing_rates')
      .select('*')
      .eq('activity_type', activityType)
      .is('end_date', null)
      .eq('is_default', true)
      .single()
    if (error) throw error
    return data as BillingRateRow
  },

  async create(input: BillingRateInsert) {
    const { data, error } = await supabase
      .from('billing_rates')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as BillingRateRow
  },

  async update(id: string, input: BillingRateUpdate) {
    const { data, error } = await supabase
      .from('billing_rates')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as BillingRateRow
  },
}
