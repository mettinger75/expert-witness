'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useCaseContacts, useRemoveCaseContact } from '@/hooks/useCaseContacts'
import { useContacts } from '@/hooks/useContacts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CONTACT_TYPES, CASE_CONTACT_ROLES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/formatters'
import { Plus, Users, Mail, Phone, Search, X } from 'lucide-react'

export default function CaseContactsPage() {
  const params = useParams()
  const caseId = params.id as string
  const { data: caseContacts, isLoading } = useCaseContacts(caseId)
  const removeContact = useRemoveCaseContact()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  const { data: allContacts } = useContacts({
    search: contactSearch || undefined,
  })

  function handleRemoveContact(linkId: string, contactId: string) {
    removeContact.mutate({ id: linkId, caseId, contactId })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Case Contacts</h2>
          <p className="text-sm text-muted-foreground">People associated with this case</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Contact to Case</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search existing contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {allContacts?.length ? (
                  allContacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setAddDialogOpen(false)}
                    >
                      <div>
                        <div className="font-medium text-sm">{c.first_name} {c.last_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getLabelForValue(CONTACT_TYPES, c.contact_type)}
                          {c.organization ? ` - ${c.organization}` : ''}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">Add</Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {contactSearch ? 'No contacts found.' : 'Start typing to search contacts.'}
                  </p>
                )}
              </div>
              <div className="pt-2 border-t">
                <Link href="/contacts/new">
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Contact
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : !caseContacts?.length ? (
        <EmptyState
          icon={Users}
          title="No contacts linked"
          description="Add contacts to track the people involved with this case."
          action={
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {caseContacts.map((link: { id: string; contact_id: string; role: string; is_primary: boolean; contacts?: { first_name: string; last_name: string; contact_type: string; email: string | null; phone: string | null; organization: string | null } }) => (
            <Card key={link.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/contacts/${link.contact_id}`}
                      className="font-semibold hover:underline"
                    >
                      {link.contacts?.first_name} {link.contacts?.last_name}
                    </Link>
                    <Badge variant="secondary">
                      {getLabelForValue(CASE_CONTACT_ROLES, link.role)}
                    </Badge>
                    {link.is_primary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {link.contacts?.organization && (
                      <span>{link.contacts.organization}</span>
                    )}
                    {link.contacts?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {link.contacts.email}
                      </span>
                    )}
                    {link.contacts?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {formatPhoneNumber(link.contacts.phone)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveContact(link.id, link.contact_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
