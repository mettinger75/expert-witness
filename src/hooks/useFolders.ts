import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { foldersService } from '@/services/folders.service'
import type { DocumentFolderInsert } from '@/types/database.types'
import { toast } from 'sonner'

export function useFolders(caseId: string) {
  return useQuery({
    queryKey: ['folders', 'case', caseId],
    queryFn: () => foldersService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DocumentFolderInsert) => foldersService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', 'case', data.case_id] })
      toast.success('Folder created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folder: ${error.message}`)
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      foldersService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['folders', 'case', caseId] })
      toast.success('Folder deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete folder: ${error.message}`)
    },
  })
}
