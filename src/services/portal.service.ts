import { supabase } from '@/lib/supabase'
import type { PortalInviteRow, PortalInviteInsert, PortalMessageRow, PortalMessageInsert } from '@/types/database.types'
import crypto from 'crypto'

export const portalService = {
  // ── Invites ──────────────────────────────────────────────────────────

  async createInvite(input: Omit<PortalInviteInsert, 'token'>): Promise<PortalInviteRow> {
    const token = crypto.randomBytes(32).toString('hex')
    const { data, error } = await supabase
      .from('portal_invites')
      .insert({ ...input, token })
      .select()
      .single()
    if (error) throw error
    return data as PortalInviteRow
  },

  async getActiveInquiryInvites() {
    const { data, error } = await supabase
      .from('portal_invites')
      .select('*, contacts(first_name, last_name, email, organization_name), cases(id, case_name, case_number, status, created_at)')
      .eq('is_active', true)
      .eq('onboarding_mode', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getInvitesByCase(caseId: string): Promise<PortalInviteRow[]> {
    const { data, error } = await supabase
      .from('portal_invites')
      .select('*, contacts(*)')
      .eq('case_id', caseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as PortalInviteRow[]
  },

  async getInviteByToken(token: string): Promise<PortalInviteRow | null> {
    const { data, error } = await supabase
      .from('portal_invites')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()
    if (error) return null
    return data as PortalInviteRow
  },

  async revokeInvite(id: string): Promise<void> {
    const { error } = await supabase
      .from('portal_invites')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
  },

  // ── Messages ─────────────────────────────────────────────────────────

  async getMessages(portalInviteId: string): Promise<PortalMessageRow[]> {
    const { data, error } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('portal_invite_id', portalInviteId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as PortalMessageRow[]
  },

  async getMessagesByCase(caseId: string): Promise<(PortalMessageRow & { portal_invites: PortalInviteRow })[]> {
    const { data, error } = await supabase
      .from('portal_messages')
      .select('*, portal_invites(*, contacts(*))')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as (PortalMessageRow & { portal_invites: PortalInviteRow })[]
  },

  async createMessage(input: PortalMessageInsert): Promise<PortalMessageRow> {
    const { data, error } = await supabase
      .from('portal_messages')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as PortalMessageRow
  },

  async markMessagesRead(portalInviteId: string, senderType: 'attorney' | 'provider'): Promise<void> {
    // Mark messages FROM the other party as read
    const readSenderType = senderType === 'attorney' ? 'provider' : 'attorney'
    const { error } = await supabase
      .from('portal_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('portal_invite_id', portalInviteId)
      .eq('sender_type', readSenderType)
      .eq('is_read', false)
    if (error) throw error
  },
}
