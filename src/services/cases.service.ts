import { supabase } from '@/lib/supabase'
import type { CaseRow, CaseInsert, CaseUpdate } from '@/types/database.types'

export interface CaseFilters {
  status?: string
  case_type?: string
  side?: string
  priority?: string
  search?: string
  is_closed?: boolean
}

export const casesService = {
  async getAll(filters?: CaseFilters) {
    let query = supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.case_type) query = query.eq('case_type', filters.case_type)
    if (filters?.side) query = query.eq('side', filters.side)
    if (filters?.priority) query = query.eq('priority', filters.priority)
    if (filters?.search) {
      query = query.or(`case_name.ilike.%${filters.search}%,case_number.ilike.%${filters.search}%,patient_name.ilike.%${filters.search}%`)
    }
    if (filters?.is_closed === false) {
      query = query.not('status', 'in', '("closed","declined","withdrawn")')
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as CaseRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as CaseRow
  },

  async create(input: CaseInsert) {
    const { data, error } = await supabase
      .from('cases')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as CaseRow
  },

  async update(id: string, input: CaseUpdate) {
    const { data, error } = await supabase
      .from('cases')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CaseRow
  },

  async archive(id: string) {
    return casesService.update(id, { status: 'closed', is_archived: true })
  },

  async getStats() {
    const { data, error } = await supabase
      .from('cases')
      .select('status, priority, total_billed, total_paid, outstanding_balance')
    if (error) throw error

    const cases = data ?? []
    const activeCases = cases.filter(c => !['closed', 'declined', 'withdrawn'].includes(c.status))
    const totalBilled = cases.reduce((sum, c) => sum + (c.total_billed || 0), 0)
    const totalPaid = cases.reduce((sum, c) => sum + (c.total_paid || 0), 0)
    const totalOutstanding = cases.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0)

    return {
      totalCases: cases.length,
      activeCases: activeCases.length,
      totalBilled,
      totalPaid,
      totalOutstanding,
    }
  },
}
