'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useCase, useUpdateCase } from '@/hooks/useCases'
import { CaseForm } from '@/components/cases/CaseForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { Loader2 } from 'lucide-react'
import type { CaseInsert } from '@/types/database.types'

export default function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = use(params)
  const router = useRouter()
  const { data: caseData, isLoading, error } = useCase(caseId)
  const updateCase = useUpdateCase()

  async function handleSubmit(data: CaseInsert) {
    await updateCase.mutateAsync({ id: caseId, data })
    router.push(`/cases/${caseId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Case not found</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Edit: ${caseData.case_name}`}
        description="Update case details"
      />
      <CaseForm
        initialData={caseData}
        onSubmit={handleSubmit}
        isSubmitting={updateCase.isPending}
      />
    </div>
  )
}
