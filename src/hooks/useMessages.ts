import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagesService } from '@/services/messages.service'
import type { AIMessageInsert } from '@/types/database.types'
import { toast } from 'sonner'

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', 'conversation', conversationId],
    queryFn: () => messagesService.getByConversationId(conversationId),
    enabled: !!conversationId,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AIMessageInsert) => messagesService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', data.conversation_id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`)
    },
  })
}
