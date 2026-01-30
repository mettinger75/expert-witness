import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settings.service'
import type { Json } from '@/types/database.types'
import { toast } from 'sonner'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getAll(),
  })
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: ['settings', key],
    queryFn: () => settingsService.getByKey(key),
    enabled: !!key,
  })
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Json }) =>
      settingsService.update(key, value),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings', key] })
      toast.success('Setting updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update setting: ${error.message}`)
    },
  })
}
