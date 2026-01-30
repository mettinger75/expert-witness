import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingRatesService } from '@/services/billingRates.service'
import type { BillingRateInsert, BillingRateUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useBillingRates() {
  return useQuery({
    queryKey: ['billing_rates'],
    queryFn: () => billingRatesService.getAll(),
  })
}

export function useCreateBillingRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BillingRateInsert) => billingRatesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_rates'] })
      toast.success('Billing rate created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create billing rate: ${error.message}`)
    },
  })
}

export function useUpdateBillingRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BillingRateUpdate }) =>
      billingRatesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_rates'] })
      toast.success('Billing rate updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update billing rate: ${error.message}`)
    },
  })
}
