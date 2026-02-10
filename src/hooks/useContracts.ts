import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsService } from '@/services/contracts.service'
import type { ContractInsert, ContractUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useContracts(caseId: string) {
  return useQuery({
    queryKey: ['contracts', 'case', caseId],
    queryFn: () => contractsService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContractInsert) => contractsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'case', data.case_id] })
      toast.success('Contract created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contract: ${error.message}`)
    },
  })
}

export function useUpdateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContractUpdate }) =>
      contractsService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['contracts', data.id] })
      toast.success('Contract updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contract: ${error.message}`)
    },
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      contractsService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'case', caseId] })
      toast.success('Contract deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contract: ${error.message}`)
    },
  })
}
