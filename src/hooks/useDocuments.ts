import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsService, type DocumentFilters } from '@/services/documents.service'
import type { DocumentInsert, DocumentUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useDocuments(caseId: string, filters?: DocumentFilters) {
  return useQuery({
    queryKey: ['documents', 'case', caseId, filters],
    queryFn: () => documentsService.getByCaseId(caseId, filters),
    enabled: !!caseId,
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DocumentInsert) => documentsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'case', data.case_id] })
      toast.success('Document created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create document: ${error.message}`)
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DocumentUpdate }) =>
      documentsService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.id] })
      toast.success('Document updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document: ${error.message}`)
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      documentsService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'case', caseId] })
      toast.success('Document deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`)
    },
  })
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: ({ caseId, file }: { caseId: string; file: File }) =>
      documentsService.upload(caseId, file),
    onSuccess: () => {
      toast.success('File uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload file: ${error.message}`)
    },
  })
}
