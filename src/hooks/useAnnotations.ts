import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { annotationsService } from '@/services/annotations.service'
import type { DocumentAnnotationInsert, DocumentAnnotationUpdate } from '@/types/database.types'
import { toast } from 'sonner'

// ── Annotations by document ─────────────────────────────────────────────────

export function useAnnotations(documentId: string) {
  return useQuery({
    queryKey: ['annotations', 'document', documentId],
    queryFn: () => annotationsService.getByDocumentId(documentId),
    enabled: !!documentId,
  })
}

export function useAnnotationsByCaseId(caseId: string) {
  return useQuery({
    queryKey: ['annotations', 'case', caseId],
    queryFn: () => annotationsService.getByCaseDocuments(caseId),
    enabled: !!caseId,
  })
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DocumentAnnotationInsert) => annotationsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['annotations', 'document', data.document_id] })
      toast.success('Annotation saved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create annotation: ${error.message}`)
    },
  })
}

export function useUpdateAnnotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DocumentAnnotationUpdate }) =>
      annotationsService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['annotations', 'document', data.document_id] })
      toast.success('Annotation updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update annotation: ${error.message}`)
    },
  })
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, documentId }: { id: string; documentId: string }) =>
      annotationsService.delete(id),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['annotations', 'document', documentId] })
      toast.success('Annotation deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete annotation: ${error.message}`)
    },
  })
}
