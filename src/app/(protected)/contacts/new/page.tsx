'use client'

import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ContactForm } from '@/components/contacts/ContactForm'
import { useCreateContact } from '@/hooks/useContacts'
import type { ContactInsert } from '@/types/database.types'

export default function NewContactPage() {
  const router = useRouter()
  const createContact = useCreateContact()

  async function handleSubmit(data: ContactInsert) {
    const contact = await createContact.mutateAsync(data)
    router.push(`/contacts/${contact.id}`)
  }

  return (
    <div>
      <PageHeader
        title="New Contact"
        description="Add a new contact to your professional directory"
      />
      <ContactForm
        onSubmit={handleSubmit}
        isSubmitting={createContact.isPending}
      />
    </div>
  )
}
