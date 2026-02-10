import { supabase } from '@/lib/supabase'
import type { MeetingRow, MeetingInsert, MeetingUpdate } from '@/types/database.types'

export const meetingsService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('case_id', caseId)
      .order('meeting_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as MeetingRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as MeetingRow
  },

  async create(input: MeetingInsert) {
    const { data, error } = await supabase
      .from('meetings')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as MeetingRow
  },

  async update(id: string, input: MeetingUpdate) {
    const { data, error } = await supabase
      .from('meetings')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as MeetingRow
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async uploadRecording(caseId: string, file: File) {
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `cases/${caseId}/meetings/${timestamp}_${sanitizedName}`

    const { error } = await supabase.storage
      .from('meeting-recordings')
      .upload(filePath, file, {
        contentType: file.type || 'audio/webm',
        upsert: false,
      })
    if (error) throw error

    return filePath
  },

  async getRecordingUrl(path: string) {
    const { data, error } = await supabase.storage
      .from('meeting-recordings')
      .createSignedUrl(path, 3600) // 1 hour expiry
    if (error) throw error
    return data.signedUrl
  },
}
