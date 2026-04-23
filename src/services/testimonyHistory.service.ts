import { supabase } from '@/lib/supabase'

export type TestimonyType = 'deposition' | 'trial' | 'hearing' | 'arbitration'
export type TestimonySide = 'plaintiff' | 'defense' | 'unknown'
export type TestimonySource = 'manual' | 'auto_deposition' | 'imported'

export interface TestimonyHistoryRow {
  id: string
  case_id: string | null
  deposition_id: string | null
  case_caption: string
  case_number: string | null
  court_venue: string | null
  jurisdiction: string | null
  testimony_date: string
  testimony_type: TestimonyType
  side_retained_by: TestimonySide
  retaining_attorney: string | null
  retaining_firm: string | null
  notes: string | null
  is_published: boolean
  source: TestimonySource
  created_at: string
  updated_at: string
}

export interface TestimonyHistoryInsert {
  case_id?: string | null
  deposition_id?: string | null
  case_caption: string
  case_number?: string | null
  court_venue?: string | null
  jurisdiction?: string | null
  testimony_date: string
  testimony_type: TestimonyType
  side_retained_by: TestimonySide
  retaining_attorney?: string | null
  retaining_firm?: string | null
  notes?: string | null
  is_published?: boolean
  source?: TestimonySource
}

export type TestimonyHistoryUpdate = Partial<TestimonyHistoryInsert>

export interface TestimonyHistoryFilters {
  publishedOnly?: boolean
  yearsBack?: number
  type?: TestimonyType
}

export const testimonyHistoryService = {
  async list(filters: TestimonyHistoryFilters = {}) {
    let query = supabase
      .from('testimony_history')
      .select('*')
      .order('testimony_date', { ascending: false })

    if (filters.publishedOnly) {
      query = query.eq('is_published', true)
    }

    if (filters.type) {
      query = query.eq('testimony_type', filters.type)
    }

    if (filters.yearsBack && filters.yearsBack > 0) {
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - filters.yearsBack)
      query = query.gte('testimony_date', cutoff.toISOString().slice(0, 10))
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as TestimonyHistoryRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('testimony_history')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as TestimonyHistoryRow
  },

  async create(input: TestimonyHistoryInsert) {
    const { data, error } = await supabase
      .from('testimony_history')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as TestimonyHistoryRow
  },

  async update(id: string, input: TestimonyHistoryUpdate) {
    const { data, error } = await supabase
      .from('testimony_history')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as TestimonyHistoryRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('testimony_history')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
