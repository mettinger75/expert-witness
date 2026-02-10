import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { meetingsService } from '@/services/meetings.service'
import type { MeetingInsert, MeetingUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useMeetings(caseId: string) {
  return useQuery({
    queryKey: ['meetings', 'case', caseId],
    queryFn: () => meetingsService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meetings', id],
    queryFn: () => meetingsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MeetingInsert) => meetingsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'case', data.case_id] })
      toast.success('Meeting created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create meeting: ${error.message}`)
    },
  })
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MeetingUpdate }) =>
      meetingsService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['meetings', data.id] })
      toast.success('Meeting updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update meeting: ${error.message}`)
    },
  })
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      meetingsService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'case', caseId] })
      toast.success('Meeting deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete meeting: ${error.message}`)
    },
  })
}

export function useUploadRecording() {
  return useMutation({
    mutationFn: ({ caseId, file }: { caseId: string; file: File }) =>
      meetingsService.uploadRecording(caseId, file),
    onSuccess: () => {
      toast.success('Recording uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload recording: ${error.message}`)
    },
  })
}
