import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsLibraryService, type PromptFilters } from '@/services/promptsLibrary.service'
import type { AIPromptsLibraryInsert, AIPromptsLibraryUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function usePrompts(filters?: PromptFilters) {
  return useQuery({
    queryKey: ['prompts', filters],
    queryFn: () => promptsLibraryService.getAll(filters),
  })
}

export function useCreatePrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AIPromptsLibraryInsert) => promptsLibraryService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Prompt created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create prompt: ${error.message}`)
    },
  })
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AIPromptsLibraryUpdate }) =>
      promptsLibraryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Prompt updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update prompt: ${error.message}`)
    },
  })
}
