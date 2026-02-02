'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CONTACT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/formatters'
import type { ContactRow } from '@/types/database.types'
import { Building2, Mail, Phone, Briefcase } from 'lucide-react'

interface ContactCardProps {
  contact: ContactRow
  linkedCaseCount: number
}

const contactTypeColorMap: Record<string, string> = {
  attorney: 'blue',
  paralegal: 'purple',
  expert: 'green',
  physician: 'green',
  nurse: 'green',
  patient: 'yellow',
  insurance: 'orange',
  court: 'slate',
  other: 'gray',
}

export function ContactCard({ contact, linkedCaseCount }: ContactCardProps) {
  const typeLabel = getLabelForValue(CONTACT_TYPES, contact.contact_type)
  const typeColor = contactTypeColorMap[contact.contact_type] ?? 'gray'

  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">
                {contact.first_name} {contact.last_name}
              </h3>
              <StatusBadge label={typeLabel} color={typeColor} />
            </div>
            {linkedCaseCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                {linkedCaseCount} {linkedCaseCount === 1 ? 'case' : 'cases'}
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            {contact.organization && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{contact.organization}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="truncate text-accent hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {contact.email}
                </a>
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
  )
}
