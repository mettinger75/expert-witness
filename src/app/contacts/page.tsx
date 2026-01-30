'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useContacts } from '@/hooks/useContacts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CONTACT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/formatters'
import { Plus, Search, Users, Mail, Phone, Building } from 'lucide-react'

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: contacts, isLoading } = useContacts({
    search: search || undefined,
    contact_type: typeFilter !== 'all' ? typeFilter : undefined,
  })

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Manage your professional contacts directory"
        action={
          <Link href="/contacts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Contact Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTACT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : !contacts?.length ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description="Add your first contact to build your professional directory."
          action={
            <Link href="/contacts/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      {contact.organization && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          <Building className="h-3 w-3 shrink-0" />
                          <span className="truncate">{contact.organization}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 ml-2">
                      {getLabelForValue(CONTACT_TYPES, contact.contact_type)}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatPhoneNumber(contact.phone)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
