'use client'

import { useRouter } from 'next/navigation'
import { useCreateCase } from '@/hooks/useCases'
import { CaseForm } from '@/components/cases/CaseForm'
import { PageHeader } from '@/components/layout/PageHeader'
import type { CaseInsert } from '@/types/database.types'

export default function NewCasePage() {
  const router = useRouter()
  const createCase = useCreateCase()

  async function handleSubmit(data: CaseInsert) {
    const result = await createCase.mutateAsync(data)
    router.push(`/cases/${result.id}`)
  }

  return (
    <div>
      <PageHeader
        title="New Case"
        description="Create a new expert witness engagement"
      />
      <CaseForm
        onSubmit={handleSubmit}
        isSubmitting={createCase.isPending}
      />
    </div>
  )
}
