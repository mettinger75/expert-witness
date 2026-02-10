'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useContact } from '@/hooks/useContacts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CONTACT_TYPES, getLabelForValue } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  User,
  Briefcase,
  FileText,
  FolderOpen,
  DollarSign,
  Mail,
  Edit,
} from 'lucide-react'

const tabs = [
  { label: 'Overview', href: '', icon: User },
  { label: 'Cases', href: '/cases', icon: Briefcase },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'Billing', href: '/billing', icon: DollarSign },
  { label: 'Communications', href: '/communications', icon: Mail },
]

export default function ContactDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const contactId = params.id as string
  const { data: contact, isLoading } = useContact(contactId)

  if (isLoading) {
    return <LoadingSpinner className="py-12" />
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contact not found</p>
        <Link href="/contacts">
          <Button variant="link">Back to Contacts</Button>
        </Link>
      </div>
    )
  }

  const basePath = `/contacts/${contactId}`

  return (
    <div>
      {/* Contact Header */}
      <div className="mb-6">
        <Link href="/contacts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Contacts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">
                {getLabelForValue(CONTACT_TYPES, contact.contact_type)}
              </Badge>
            </div>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
            >
              {contact.first_name} {contact.last_name}
            </h1>
            {(contact.organization || contact.title) && (
              <p className="text-sm text-muted-foreground mt-1">
                {[contact.title, contact.organization].filter(Boolean).join(' at ')}
              </p>
            )}
          </div>
          <Link href={`${basePath}?edit=true`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Contact
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6 -mx-8 px-8">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const href = `${basePath}${tab.href}`
            const isActive = tab.href === ''
              ? pathname === basePath
              : pathname.startsWith(href)

            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                )}
                style={isActive ? { borderBottomColor: '#C9A84C' } : undefined}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {children}
    </div>
  )
}
