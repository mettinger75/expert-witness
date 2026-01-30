import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsService } from '@/services/payments.service'
import type { PaymentInsert } from '@/types/database.types'
import { toast } from 'sonner'

export function usePayments(invoiceId: string) {
  return useQuery({
    queryKey: ['payments', 'invoice', invoiceId],
    queryFn: () => paymentsService.getByInvoiceId(invoiceId),
    enabled: !!invoiceId,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentInsert) => paymentsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      if (data.invoice_id) {
        queryClient.invalidateQueries({ queryKey: ['payments', 'invoice', data.invoice_id] })
        queryClient.invalidateQueries({ queryKey: ['invoices', data.invoice_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`)
    },
  })
}
