'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalService } from '@/services/portal.service'
import type { PortalInviteInsert, PortalMessageInsert } from '@/types/database.types'

// ── Invite Queries ───────────────────────────────────────────────────

export function usePortalInvites(caseId: string) {
  return useQuery({
    queryKey: ['portal_invites', caseId],
    queryFn: () => portalService.getInvitesByCase(caseId),
    enabled: !!caseId,
  })
}

export function useCreatePortalInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<PortalInviteInsert, 'token'>) =>
      portalService.createInvite(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['portal_invites', vars.case_id] })
    },
  })
}

export function useRevokePortalInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      portalService.revokeInvite(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['portal_invites', vars.caseId] })
    },
  })
}

// ── Message Queries (Dashboard side) ─────────────────────────────────

export function usePortalMessages(caseId: string) {
  return useQuery({
    queryKey: ['portal_messages', caseId],
    queryFn: () => portalService.getMessagesByCase(caseId),
    enabled: !!caseId,
  })
}

export function useCreatePortalMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PortalMessageInsert) =>
      portalService.createMessage(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['portal_messages', vars.case_id] })
    },
  })
}
