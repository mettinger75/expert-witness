import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chargesService, type ChargeInput } from '@/services/charges.service'
import { toast } from 'sonner'

export function useUnbilledCharges(caseId: string) {
  return useQuery({
    queryKey: ['charges', 'unbilled', caseId],
    queryFn: () => chargesService.getUnbilled(caseId),
    enabled: !!caseId,
  })
}

export function useCaseCharges(caseId: string) {
  return useQuery({
    queryKey: ['charges', 'case', caseId],
    queryFn: () => chargesService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useCreateCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChargeInput) => chargesService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Charge created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create charge: ${error.message}`)
    },
  })
}

export function useUpdateCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChargeInput> }) =>
      chargesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      toast.success('Charge updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update charge: ${error.message}`)
    },
  })
}

export function useDeleteCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => chargesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Charge deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete charge: ${error.message}`)
    },
  })
}
