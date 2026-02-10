import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationLogsService } from '@/services/communicationLogs.service'
import type { CommunicationLogInsert, CommunicationLogUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useCommunicationLogs(caseId: string) {
  return useQuery({
    queryKey: ['communication_logs', 'case', caseId],
    queryFn: () => communicationLogsService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

/** Fetch all unassigned emails (the inbox) */
export function useInboxEmails() {
  return useQuery({
    queryKey: ['communication_logs', 'inbox'],
    queryFn: () => communicationLogsService.getUnassigned(),
  })
}

export function useCreateCommunicationLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CommunicationLogInsert) => communicationLogsService.create(input),
    onSuccess: (data) => {
      if (data.case_id) {
        queryClient.invalidateQueries({ queryKey: ['communication_logs', 'case', data.case_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['communication_logs', 'inbox'] })
      toast.success('Communication log created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create communication log: ${error.message}`)
    },
  })
}

/** Assign an inbox email to a case */
export function useAssignEmailToCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ emailId, caseId }: { emailId: string; caseId: string }) =>
      communicationLogsService.assignToCase(emailId, caseId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communication_logs', 'inbox'] })
      if (data.case_id) {
        queryClient.invalidateQueries({ queryKey: ['communication_logs', 'case', data.case_id] })
      }
      toast.success('Email assigned to case')
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign email: ${error.message}`)
    },
  })
}

/** Update a communication log entry */
export function useUpdateCommunicationLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CommunicationLogUpdate }) =>
      communicationLogsService.update(id, data),
    onSuccess: (data) => {
      if (data.case_id) {
        queryClient.invalidateQueries({ queryKey: ['communication_logs', 'case', data.case_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['communication_logs', 'inbox'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to update communication log: ${error.message}`)
    },
  })
}

/** Delete an inbox email */
export function useDeleteEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => communicationLogsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication_logs', 'inbox'] })
      toast.success('Email deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email: ${error.message}`)
    },
  })
}
