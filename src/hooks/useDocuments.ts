import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsService, type DocumentFilters } from '@/services/documents.service'
import type { DocumentInsert, DocumentUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useAllDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: ['documents', 'all', filters],
    queryFn: () => documentsService.getAll(filters),
  })
}

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
      // Step 1: Get a signed upload URL (small JSON request — no file data)
      const urlRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-upload-url',
          caseId,
          fileName: file.name,
          folderId: folderId || undefined,
        }),
      })

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({ error: 'Failed to get upload URL' }))
        throw new Error(err.error || `Upload URL request failed (${urlRes.status})`)
      }

      const { uploadUrl, storagePath } = await urlRes.json()

      // Step 2: Upload file directly to Supabase Storage (bypasses Vercel body limit)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed (${uploadRes.status})`)
      }

      // Step 3: Confirm upload and create DB record
      const confirmRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-upload',
          storagePath,
          caseId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          category: category || 'medical_record',
          description: description || undefined,
          folderId: folderId || undefined,
        }),
      })

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({ error: 'Failed to create record' }))
        throw new Error(err.error || `Record creation failed (${confirmRes.status})`)
      }

      return confirmRes.json()
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
