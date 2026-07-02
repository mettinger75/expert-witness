import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sharedLinksService } from '@/services/shared-links.service'
import type { SharedLinkInsert } from '@/types/database.types'
import { authHeaders } from '@/lib/api-client'
import { toast } from 'sonner'

export function useSharedLinks(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['shared-links', entityType, entityId],
    queryFn: () => sharedLinksService.getByEntity(entityType, entityId),
    enabled: !!entityType && !!entityId,
  })
}

export function useCreateSharedLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      entityType: string
      entityId: string
      permission: 'view' | 'edit' | 'sign'
      recipientName?: string
      recipientEmail?: string
      expiresInDays: number
      pin?: string
      contactId?: string
    }) => {
      const res = await fetch('/api/shared-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create share link')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['shared-links', data.sharedLink.entity_type, data.sharedLink.entity_id],
      })
      toast.success('Share link created')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create link')
    },
  })
}

export function useRevokeSharedLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sharedLinksService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-links'] })
      toast.success('Share link revoked')
    },
    onError: () => {
      toast.error('Failed to revoke link')
    },
  })
}
