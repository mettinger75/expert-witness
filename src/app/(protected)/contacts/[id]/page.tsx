'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useContact, useUpdateContact, useDeleteContact } from '@/hooks/useContacts'
import { useContactCases } from '@/hooks/useCaseContacts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CONTACT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber, formatDate, formatCurrency } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import {
  Mail, Phone, Building, MapPin,
  Briefcase, User, FileText, DollarSign, MessageSquare, Trash2, AlertTriangle,
} from 'lucide-react'

export default function ContactOverviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const contactId = params.id as string
  const router = useRouter()
  const { data: contact, isLoading } = useContact(contactId)
  const { data: linkedCases, isLoading: casesLoading } = useContactCases(contactId)
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<{ linkedCases?: number; activePortalInvites?: number; message?: string } | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    organization_name: '',
    email: '',
    phone_primary: '',
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
        organization_name: contact.organization_name || '',
        email: contact.email || '',
        phone_primary: contact.phone_primary || '',
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
          organization_name: editForm.organization_name || null,
          email: editForm.email || null,
          phone_primary: editForm.phone_primary || null,
          title: editForm.title || null,
        },
      },
      { onSuccess: () => setEditOpen(false) }
    )
  }

  function handleDeleteContact(force = false) {
    deleteContact.mutate(
      { id: contactId, force },
      {
        onSuccess: () => {
          setDeleteOpen(false)
          router.push('/contacts')
        },
        onError: (error: unknown) => {
          const err = error as { linkedCases?: number; activePortalInvites?: number; details?: string; message?: string }
          if (err.linkedCases || err.activePortalInvites) {
            setDeleteError({
              linkedCases: err.linkedCases,
              activePortalInvites: err.activePortalInvites,
              message: err.details || err.message,
            })
          }
        },
      }
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                setDeleteError(null)
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
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
            {contact.phone_primary && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone_primary}`} className="text-sm hover:underline" style={{ color: '#091525' }}>
                  {formatPhoneNumber(contact.phone_primary)}
                </a>
              </div>
            )}
            {contact.phone_secondary && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone_secondary}`} className="text-sm hover:underline" style={{ color: '#091525' }}>
                  {formatPhoneNumber(contact.phone_secondary)} (Alt)
                </a>
              </div>
            )}
            {contact.organization_name && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.organization_name}</span>
              </div>
            )}
            {(contact.address_street || contact.address_city) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  {contact.address_street && <div>{contact.address_street}</div>}
                  {(contact.address_city || contact.address_state || contact.address_zip) && (
                    <div>
                      {[contact.address_city, contact.address_state].filter(Boolean).join(', ')} {contact.address_zip}
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
              <Label htmlFor="organization_name">Organization</Label>
              <Input
                id="organization_name"
                value={editForm.organization_name}
                onChange={(e) => setEditForm((p) => ({ ...p, organization_name: e.target.value }))}
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
              <Label htmlFor="phone_primary">Phone</Label>
              <Input
                id="phone_primary"
                value={editForm.phone_primary}
                onChange={(e) => setEditForm((p) => ({ ...p, phone_primary: e.target.value }))}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Contact
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <strong>{contact.first_name} {contact.last_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">This contact has linked records:</p>
                  <ul className="mt-1 space-y-1 text-amber-700">
                    {(deleteError.linkedCases ?? 0) > 0 && (
                      <li>Linked to {deleteError.linkedCases} case(s) — will be unlinked</li>
                    )}
                    {(deleteError.activePortalInvites ?? 0) > 0 && (
                      <li>{deleteError.activePortalInvites} active portal invite(s) — will be deactivated</li>
                    )}
                  </ul>
                  <p className="mt-2 text-amber-800 font-medium">Delete anyway?</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            {deleteError ? (
              <Button
                variant="destructive"
                onClick={() => handleDeleteContact(true)}
                disabled={deleteContact.isPending}
              >
                {deleteContact.isPending ? 'Deleting...' : 'Delete Anyway'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => handleDeleteContact(false)}
                disabled={deleteContact.isPending}
              >
                {deleteContact.isPending ? 'Deleting...' : 'Delete Contact'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
