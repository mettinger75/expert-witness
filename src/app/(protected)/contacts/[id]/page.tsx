'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useContact } from '@/hooks/useContacts'
import { useContactCases } from '@/hooks/useCaseContacts'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CONTACT_TYPES, CASE_CONTACT_ROLES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber, formatDate } from '@/lib/formatters'
import {
  ArrowLeft, Edit, Mail, Phone, Building, MapPin,
  Briefcase, User,
} from 'lucide-react'

export default function ContactDetailPage() {
  const params = useParams()
  const contactId = params.id as string
  const { data: contact, isLoading } = useContact(contactId)
  const { data: linkedCases, isLoading: casesLoading } = useContactCases(contactId)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading || !contact) {
    return <LoadingSpinner className="py-12" />
  }

  return (
    <div>
      <Link href="/contacts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Contacts
      </Link>

      <PageHeader
        title={`${contact.first_name} ${contact.last_name}`}
        description={contact.organization ?? undefined}
        action={
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" defaultValue={contact.first_name} />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" defaultValue={contact.last_name} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input id="organization" defaultValue={contact.organization ?? ''} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={contact.email ?? ''} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue={contact.phone ?? ''} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button onClick={() => setEditOpen(false)}>Save Changes</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
                  <div className="mt-1">
                    <Badge variant="secondary">
                      {getLabelForValue(CONTACT_TYPES, contact.contact_type)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
                  <p className="mt-1">{contact.title || '-'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-sm hover:underline" style={{ color: '#091525' }}>
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatPhoneNumber(contact.phone)}</span>
                  </div>
                )}
                {contact.phone_alt && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatPhoneNumber(contact.phone_alt)} (Alt)</span>
                  </div>
                )}
                {contact.organization && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.organization}</span>
                  </div>
                )}
                {(contact.address_line1 || contact.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      {contact.address_line1 && <div>{contact.address_line1}</div>}
                      {contact.address_line2 && <div>{contact.address_line2}</div>}
                      {(contact.city || contact.state || contact.zip) && (
                        <div>
                          {[contact.city, contact.state].filter(Boolean).join(', ')} {contact.zip}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {contact.notes && (
                <>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Linked Cases */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Linked Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <LoadingSpinner size="sm" />
              ) : !linkedCases?.length ? (
                <p className="text-sm text-muted-foreground">No linked cases.</p>
              ) : (
                <div className="space-y-3">
                  {linkedCases.map((link: { id: string; case_id: string; role: string; cases?: { case_name: string; case_number: string } }) => (
                    <Link key={link.id} href={`/cases/${link.case_id}`} className="block">
                      <div className="p-3 rounded-md border hover:bg-muted/50 transition-colors">
                        <div className="font-medium text-sm">
                          {link.cases?.case_name ?? 'Unknown Case'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {link.cases?.case_number}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getLabelForValue(CASE_CONTACT_ROLES, link.role)}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
