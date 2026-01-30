import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsService } from '@/services/conversations.service'
import type { AIConversationInsert } from '@/types/database.types'
import { toast } from 'sonner'

export function useConversations(caseId?: string) {
  return useQuery({
    queryKey: ['conversations', caseId ?? 'all'],
    queryFn: () => (caseId ? conversationsService.getByCaseId(caseId) : conversationsService.getAll()),
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => conversationsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AIConversationInsert) => conversationsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (data.case_id) {
        queryClient.invalidateQueries({ queryKey: ['conversations', data.case_id] })
      }
      toast.success('Conversation created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create conversation: ${error.message}`)
    },
  })
}
