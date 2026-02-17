'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useCaseContacts, useRemoveCaseContact, useAddCaseContact } from '@/hooks/useCaseContacts'
import { useContacts } from '@/hooks/useContacts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CONTACT_TYPES, CASE_CONTACT_ROLES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/formatters'
import type { CaseContactRole } from '@/types/database.types'
import { Plus, Users, Mail, Phone, Search, X, Check } from 'lucide-react'

export default function CaseContactsPage() {
  const params = useParams()
  const caseId = params.id as string
  const { data: caseContacts, isLoading } = useCaseContacts(caseId)
  const removeContact = useRemoveCaseContact()
  const addCaseContact = useAddCaseContact()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<CaseContactRole>('retaining_attorney')
  const [isPrimary, setIsPrimary] = useState(false)

  const { data: allContacts } = useContacts({
    search: contactSearch || undefined,
  })

  // Filter out contacts already linked to this case
  const linkedContactIds = new Set(caseContacts?.map((link: { contact_id: string }) => link.contact_id) ?? [])
  const availableContacts = allContacts?.filter((c) => !linkedContactIds.has(c.id)) ?? []

  function handleRemoveContact(linkId: string, contactId: string) {
    removeContact.mutate({ id: linkId, caseId, contactId })
  }

  async function handleAddContact() {
    if (!selectedContactId) return
    await addCaseContact.mutateAsync({
      case_id: caseId,
      contact_id: selectedContactId,
      role: selectedRole,
      is_primary: isPrimary,
    })
    // Reset and close
    setSelectedContactId(null)
    setSelectedRole('retaining_attorney')
    setIsPrimary(false)
    setContactSearch('')
    setAddDialogOpen(false)
  }

  function handleCloseDialog(open: boolean) {
    setAddDialogOpen(open)
    if (!open) {
      setSelectedContactId(null)
      setSelectedRole('retaining_attorney')
      setIsPrimary(false)
      setContactSearch('')
    }
  }

  const selectedContact = allContacts?.find((c) => c.id === selectedContactId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Case Contacts</h2>
          <p className="text-sm text-muted-foreground">People associated with this case</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={handleCloseDialog}>
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
              {/* If a contact is selected, show role picker and confirm */}
              {selectedContact ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="font-medium text-sm">{selectedContact.first_name} {selectedContact.last_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getLabelForValue(CONTACT_TYPES, selectedContact.contact_type)}
                      {selectedContact.organization_name ? ` - ${selectedContact.organization_name}` : ''}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role in Case</label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CaseContactRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CASE_CONTACT_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Primary contact for this role
                  </label>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedContactId(null)}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleAddContact}
                      disabled={addCaseContact.isPending}
                    >
                      {addCaseContact.isPending ? (
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Add to Case
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search contacts */}
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
                    {availableContacts.length ? (
                      availableContacts.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedContactId(c.id)}
                        >
                          <div>
                            <div className="font-medium text-sm">{c.first_name} {c.last_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {getLabelForValue(CONTACT_TYPES, c.contact_type)}
                              {c.organization_name ? ` - ${c.organization_name}` : ''}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedContactId(c.id) }}>
                            Add
                          </Button>
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
                </>
              )}
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
          {caseContacts.map((link: { id: string; contact_id: string; role: string; is_primary: boolean; contacts?: { first_name: string; last_name: string; contact_type: string; email: string | null; phone_primary: string | null; organization_name: string | null } }) => (
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
                    {link.contacts?.organization_name && (
                      <span>{link.contacts.organization_name}</span>
                    )}
                    {link.contacts?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {link.contacts.email}
                      </span>
                    )}
                    {link.contacts?.phone_primary && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {formatPhoneNumber(link.contacts.phone_primary)}
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
