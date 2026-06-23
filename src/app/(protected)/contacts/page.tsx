'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useContacts } from '@/hooks/useContacts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CONTACT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/formatters'
import { Plus, Search, Users } from 'lucide-react'

interface CaseContactJoin {
  case_id: string
  role: string
  cases: { case_name: string; case_number: string } | null
}

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

      {/* Contacts Table */}
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
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#091525] hover:bg-[#091525]">
                <TableHead className="text-white/80 font-semibold">Name</TableHead>
                <TableHead className="text-white/80 font-semibold">Type</TableHead>
                <TableHead className="text-white/80 font-semibold">Organization</TableHead>
                <TableHead className="text-white/80 font-semibold">Email</TableHead>
                <TableHead className="text-white/80 font-semibold">Phone</TableHead>
                <TableHead className="text-white/80 font-semibold">Cases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const caseContacts = (contact as unknown as { case_contacts?: CaseContactJoin[] }).case_contacts ?? []
                return (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-[#DFC06A]/5 transition-colors"
                    onClick={() => window.location.href = `/contacts/${contact.id}`}
                  >
                    <TableCell>
                      <p className="font-medium text-[#0E1F35]">
                        {contact.contact_type === 'referral_agency'
                          ? contact.organization_name || `${contact.first_name} ${contact.last_name}`
                          : `${contact.first_name} ${contact.last_name}`
                        }
                      </p>
                      {contact.contact_type !== 'referral_agency' && (contact as unknown as { parent_contact?: { organization_name: string } | null }).parent_contact?.organization_name && (
                        <p className="text-xs text-muted-foreground">
                          {(contact as unknown as { parent_contact: { organization_name: string } }).parent_contact.organization_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getLabelForValue(CONTACT_TYPES, contact.contact_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.organization_name || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.email || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.phone_primary ? formatPhoneNumber(contact.phone_primary) : '—'}
                    </TableCell>
                    <TableCell>
                      {caseContacts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {caseContacts.slice(0, 2).map((cc) => (
                            <Badge
                              key={cc.case_id}
                              variant="outline"
                              className="text-xs max-w-[160px] truncate"
                            >
                              {cc.cases?.case_name || cc.case_id}
                            </Badge>
                          ))}
                          {caseContacts.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{caseContacts.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
