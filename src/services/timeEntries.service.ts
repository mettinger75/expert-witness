import { supabase } from '@/lib/supabase'
import type { TimeEntryRow, TimeEntryInsert, TimeEntryUpdate } from '@/types/database.types'

export interface TimeEntryFilters {
  case_id?: string
  is_billable?: boolean
  is_billed?: boolean
  date_from?: string
  date_to?: string
}

export const timeEntriesService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('case_id', caseId)
      .order('date', { ascending: false })
    if (error) throw error
    return (data ?? []) as TimeEntryRow[]
  },

  async getAll(filters?: TimeEntryFilters) {
    let query = supabase
      .from('time_entries')
      .select('*')
      .order('date', { ascending: false })

    if (filters?.case_id) query = query.eq('case_id', filters.case_id)
    if (filters?.is_billable !== undefined) query = query.eq('is_billable', filters.is_billable)
    if (filters?.is_billed !== undefined) query = query.eq('is_billed', filters.is_billed)
    if (filters?.date_from) query = query.gte('date', filters.date_from)
    if (filters?.date_to) query = query.lte('date', filters.date_to)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as TimeEntryRow[]
  },

  async getUnbilled(caseId: string) {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('case_id', caseId)
      .eq('is_billed', false)
      .eq('is_billable', true)
      .order('date', { ascending: false })
    if (error) throw error
    return (data ?? []) as TimeEntryRow[]
  },

  async create(input: TimeEntryInsert) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as TimeEntryRow
  },

  async update(id: string, input: TimeEntryUpdate) {
    const { data, error } = await supabase
      .from('time_entries')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as TimeEntryRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getCaseTotals(caseId: string) {
    const { data, error } = await supabase
      .from('time_entries')
      .select('activity_type, duration_hours, amount, is_billable, is_billed')
      .eq('case_id', caseId)
    if (error) throw error

    const entries = data ?? []
    const totalHours = entries.reduce((sum, e) => sum + (e.duration_hours || 0), 0)
    const totalBilled = entries
      .filter(e => e.is_billed)
      .reduce((sum, e) => sum + (e.amount || 0), 0)
    const byActivity = entries.reduce<Record<string, { hours: number; amount: number }>>((acc, e) => {
      if (!acc[e.activity_type]) acc[e.activity_type] = { hours: 0, amount: 0 }
      acc[e.activity_type].hours += e.duration_hours || 0
      acc[e.activity_type].amount += e.amount || 0
      return acc
    }, {})

    return { totalHours, totalBilled, byActivity }
  },
}
