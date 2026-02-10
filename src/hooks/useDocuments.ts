import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsService, type DocumentFilters } from '@/services/documents.service'
import type { DocumentInsert, DocumentUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useDocuments(caseId: string, filters?: DocumentFilters, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['documents', 'case', caseId, filters],
    queryFn: () => documentsService.getByCaseId(caseId, filters),
    enabled: !!caseId,
    refetchInterval: options?.refetchInterval,
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      caseId,
      file,
      category,
      description,
      folderId,
    }: {
      caseId: string
      file: File
      category?: string
      description?: string
      folderId?: string | null
    }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', caseId)
      formData.append('category', category || 'medical_record')
      if (description) formData.append('description', description)
      if (folderId) formData.append('folderId', folderId)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMsg = `Upload failed (${response.status})`
        try {
          const err = await response.json()
          errorMsg = err.error || errorMsg
        } catch { /* non-JSON */ }
        throw new Error(errorMsg)
      }

      return response.json()
    },
    onSuccess: (data) => {
      const caseId = data?.document?.case_id
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ['documents', 'case', caseId] })
      }
      toast.success('File uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload: ${error.message}`)
    },
  })
}

export function useProcessDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      if (!response.ok) {
        let errorMsg = `Processing failed (${response.status})`
        try { const err = await response.json(); errorMsg = err.error || errorMsg } catch { /* non-JSON */ }
        throw new Error(errorMsg)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document analyzed successfully')
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.error(`AI processing failed: ${error.message}`)
    },
  })
}
