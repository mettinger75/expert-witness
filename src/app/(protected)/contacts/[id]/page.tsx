'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useContact, useUpdateContact } from '@/hooks/useContacts'
import { useContactCases } from '@/hooks/useCaseContacts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CONTACT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber, formatDate, formatCurrency } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import {
  Mail, Phone, Building, MapPin,
  Briefcase, User, FileText, DollarSign, MessageSquare,
} from 'lucide-react'

export default function ContactOverviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const contactId = params.id as string
  const { data: contact, isLoading } = useContact(contactId)
  const { data: linkedCases, isLoading: casesLoading } = useContactCases(contactId)
  const updateContact = useUpdateContact()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    organization: '',
    email: '',
    phone: '',
    title: '',
  })

  // Open edit dialog when ?edit=true
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && contact) {
      setEditOpen(true)
    }
  }, [searchParams, contact])

  useEffect(() => {
    if (contact) {
      setEditForm({
        first_name: contact.first_name,
        last_name: contact.last_name,
        organization: contact.organization || '',
        email: contact.email || '',
        phone: contact.phone || '',
        title: contact.title || '',
      })
    }
  }, [contact])

  // Fetch shared links count
  const { data: sharedLinksCount = 0 } = useQuery({
    queryKey: ['shared-links', 'contact', contactId, 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('shared_links')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
      if (error) return 0
      return count ?? 0
    },
    enabled: !!contactId,
  })

  // Fetch outstanding balance from invoices billed to this contact
  const { data: billingStats } = useQuery({
    queryKey: ['invoices', 'contact', contactId, 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid, balance_due, status')
        .eq('bill_to_contact_id', contactId)
      if (error) return { outstanding: 0 }
      const outstanding = (data ?? []).reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0)
      return { outstanding }
    },
    enabled: !!contactId,
  })

  // Fetch last communication date
  const { data: lastCommDate } = useQuery({
    queryKey: ['communication_logs', 'contact', contactId, 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('communication_date')
        .eq('contact_id', contactId)
        .order('communication_date', { ascending: false })
        .limit(1)
      if (error || !data?.length) return null
      return data[0].communication_date
    },
    enabled: !!contactId,
  })

  function handleSaveContact() {
    updateContact.mutate(
      {
        id: contactId,
        data: {
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          organization: editForm.organization || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          title: editForm.title || null,
        },
      },
      { onSuccess: () => setEditOpen(false) }
    )
  }

  if (isLoading || !contact) {
    return <LoadingSpinner className="py-12" />
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0E1F35' }}>
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#091525' }}>
                  {casesLoading ? '...' : (linkedCases?.length ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Linked Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0E1F35' }}>
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#091525' }}>
                  {sharedLinksCount}
                </p>
                <p className="text-xs text-muted-foreground">Shared Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0E1F35' }}>
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: billingStats?.outstanding ? '#C9A84C' : '#091525' }}>
                  {formatCurrency(billingStats?.outstanding ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Outstanding Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0E1F35' }}>
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#091525' }}>
                  {lastCommDate ? formatDate(lastCommDate) : 'None'}
                </p>
                <p className="text-xs text-muted-foreground">Last Communication</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information Card */}
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
                <a href={`tel:${contact.phone}`} className="text-sm hover:underline" style={{ color: '#091525' }}>
                  {formatPhoneNumber(contact.phone)}
                </a>
              </div>
            )}
            {contact.phone_alt && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone_alt}`} className="text-sm hover:underline" style={{ color: '#091525' }}>
                  {formatPhoneNumber(contact.phone_alt)} (Alt)
                </a>
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

      {/* Edit Contact Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="title_field">Title</Label>
              <Input
                id="title_field"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Esq., MD, etc."
              />
            </div>
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={editForm.organization}
                onChange={(e) => setEditForm((p) => ({ ...p, organization: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveContact} disabled={updateContact.isPending}>
                {updateContact.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
