import { supabase } from '@/lib/supabase'
import type {
  MedicalRecordsTimelineRow,
  MedicalRecordsTimelineInsert,
  MedicalRecordsTimelineUpdate,
} from '@/types/database.types'

export interface TimelineFilters {
  event_type?: string
}

export const timelineService = {
  async getByCaseId(caseId: string, filters?: TimelineFilters) {
    let query = supabase
      .from('medical_records_timeline')
      .select('*')
      .eq('case_id', caseId)
      .order('event_date', { ascending: true })

    if (filters?.event_type) query = query.eq('event_type', filters.event_type)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as MedicalRecordsTimelineRow[]
  },

  async getByCaseIdCritical(caseId: string) {
    const { data, error } = await supabase
      .from('medical_records_timeline')
      .select('*')
      .eq('case_id', caseId)
      .eq('is_critical_event', true)
      .order('event_date', { ascending: true })
    if (error) throw error
    return (data ?? []) as MedicalRecordsTimelineRow[]
  },

  async create(input: MedicalRecordsTimelineInsert) {
    const { data, error } = await supabase
      .from('medical_records_timeline')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as MedicalRecordsTimelineRow
  },

  async update(id: string, input: MedicalRecordsTimelineUpdate) {
    const { data, error } = await supabase
      .from('medical_records_timeline')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as MedicalRecordsTimelineRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('medical_records_timeline')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
