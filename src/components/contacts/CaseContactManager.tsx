'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CASE_CONTACT_ROLES, CONTACT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/formatters'
import { useCaseContacts, useAddCaseContact, useRemoveCaseContact } from '@/hooks/useCaseContacts'
import { useContacts } from '@/hooks/useContacts'
import type { CaseContactRole } from '@/types/database.types'
import type { CaseContactWithContact } from '@/services/caseContacts.service'
import { Plus, Search, Trash2, UserPlus, Loader2 } from 'lucide-react'

interface CaseContactManagerProps {
  caseId: string
}

export function CaseContactManager({ caseId }: CaseContactManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('retaining_attorney')
  const [isPrimary, setIsPrimary] = useState(false)

  const { data: caseContacts = [], isLoading: loadingCaseContacts } = useCaseContacts(caseId)
  const { data: allContacts = [] } = useContacts()
  const addCaseContact = useAddCaseContact()
  const removeCaseContact = useRemoveCaseContact()

  const filteredContacts = allContacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase()
    const org = (contact.organization ?? '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || org.includes(query)
  })

  const linkedContactIds = new Set(
    caseContacts.map((cc: { contact_id: string }) => cc.contact_id)
  )

  async function handleAddContact() {
    if (!selectedContactId) return
    await addCaseContact.mutateAsync({
      case_id: caseId,
      contact_id: selectedContactId,
      role: selectedRole as CaseContactRole,
      is_primary: isPrimary,
    })
    setSelectedContactId(null)
    setSelectedRole('retaining_attorney')
    setIsPrimary(false)
    setSearchQuery('')
  }

  async function handleRemoveContact(id: string, contactId: string) {
    await removeCaseContact.mutateAsync({ id, caseId, contactId })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Linked Contacts</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Contact to Case</DialogTitle>
              <DialogDescription>
                Search for an existing contact and assign their role in this case.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {searchQuery && (
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {filteredContacts.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">
                      No contacts found
                    </p>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isLinked = linkedContactIds.has(contact.id)
                      return (
                        <button
                          key={contact.id}
                          type="button"
                          disabled={isLinked}
                          onClick={() => setSelectedContactId(contact.id)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-b-0 ${
                            selectedContactId === contact.id ? 'bg-muted' : ''
                          } ${isLinked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="font-medium">
                            {contact.first_name} {contact.last_name}
                            {isLinked && ' (already linked)'}
                          </div>
                          {contact.organization && (
                            <div className="text-xs text-muted-foreground">{contact.organization}</div>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )}

              {selectedContactId && (
                <>
                  <div className="space-y-2">
                    <Label>Role in Case</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
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

                  <div className="flex items-center gap-3">
                    <Switch
                      id="is-primary"
                      checked={isPrimary}
                      onCheckedChange={setIsPrimary}
                    />
                    <Label htmlFor="is-primary">Primary Contact</Label>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddContact}
                disabled={!selectedContactId || addCaseContact.isPending}
              >
                {addCaseContact.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadingCaseContacts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : caseContacts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No contacts linked to this case yet.
        </p>
      ) : (
        <div className="space-y-2">
          {caseContacts.map((cc: CaseContactWithContact) => {
            const contact = cc.contacts
            return (
              <Card key={cc.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">
                      {contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Contact'}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={getLabelForValue(CASE_CONTACT_ROLES, cc.role)}
                        color="blue"
                      />
                      {cc.is_primary && (
                        <StatusBadge label="Primary" color="green" />
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveContact(cc.id, cc.contact_id)}
                    disabled={removeCaseContact.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
