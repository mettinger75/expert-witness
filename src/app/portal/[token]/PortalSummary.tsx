'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/formatters'
import {
  User,
  Scale,
  Calendar,
  MapPin,
  Stethoscope,
  Users,
  Building,
  Mail,
  Phone,
} from 'lucide-react'

interface CaseData {
  id: string
  case_name: string
  case_number: string
  status: string
  priority: string
  side: string
  case_type: string
  specialty_area: string
  brief_summary: string
  key_issues: string | string[] | null
  patient_name: string
  patient_dob: string | null
  patient_age_at_incident: number | null
  date_of_incident: string | null
  date_of_referral: string | null
  jurisdiction_state: string | null
  jurisdiction_court: string | null
}

interface CaseContact {
  id: string
  role: string
  is_primary: boolean
  contacts: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone_primary: string | null
    organization_name: string | null
    contact_type: string
  }
}

interface PortalSummaryProps {
  caseData: CaseData
  caseContacts: CaseContact[]
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    closed: 'bg-gray-100 text-gray-800',
    on_hold: 'bg-blue-100 text-blue-800',
    intake: 'bg-purple-100 text-purple-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-800',
    urgent: 'bg-red-200 text-red-900',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-green-100 text-green-800',
    normal: 'bg-blue-100 text-blue-800',
  }
  return colors[priority] || 'bg-gray-100 text-gray-700'
}

function getSideLabel(side: string): string {
  if (side === 'plaintiff') return 'Plaintiff'
  if (side === 'defense') return 'Defense'
  return side
}

function formatKeyIssues(keyIssues: string | string[] | null): string[] {
  if (!keyIssues) return []
  if (Array.isArray(keyIssues)) return keyIssues
  // If it's a string, try splitting by newlines or semicolons
  return keyIssues
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function PortalSummary({ caseData, caseContacts }: PortalSummaryProps) {
  const issues = formatKeyIssues(caseData.key_issues)

  return (
    <div className="space-y-6">
      {/* Case Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg text-[#0E1F35]">
              Case Overview
            </CardTitle>
            <div className="flex gap-2">
              <Badge className={getStatusColor(caseData.status)}>
                {caseData.status.replace(/_/g, ' ')}
              </Badge>
              <Badge className={getPriorityColor(caseData.priority)}>
                {caseData.priority} priority
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Scale className="h-4 w-4 text-[#DFC06A] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Side
                  </p>
                  <p className="text-sm font-medium text-[#0E1F35]">
                    {getSideLabel(caseData.side)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Stethoscope className="h-4 w-4 text-[#DFC06A] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Specialty Area
                  </p>
                  <p className="text-sm font-medium text-[#0E1F35]">
                    {caseData.specialty_area || '-'}
                  </p>
                </div>
              </div>

              {caseData.case_type && (
                <div className="flex items-start gap-3">
                  <Scale className="h-4 w-4 text-[#DFC06A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Case Type
                    </p>
                    <p className="text-sm font-medium text-[#0E1F35]">
                      {caseData.case_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {caseData.jurisdiction_state && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[#DFC06A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Jurisdiction
                    </p>
                    <p className="text-sm font-medium text-[#0E1F35]">
                      {caseData.jurisdiction_state}
                      {caseData.jurisdiction_court &&
                        ` — ${caseData.jurisdiction_court}`}
                    </p>
                  </div>
                </div>
              )}

              {caseData.date_of_incident && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-[#DFC06A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Date of Incident
                    </p>
                    <p className="text-sm font-medium text-[#0E1F35]">
                      {formatDate(caseData.date_of_incident)}
                    </p>
                  </div>
                </div>
              )}

              {caseData.date_of_referral && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-[#DFC06A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Date of Referral
                    </p>
                    <p className="text-sm font-medium text-[#0E1F35]">
                      {formatDate(caseData.date_of_referral)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#0E1F35] flex items-center gap-2">
            <User className="h-5 w-5 text-[#DFC06A]" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Name
              </p>
              <p className="text-sm font-medium text-[#0E1F35]">
                {caseData.patient_name || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Date of Birth
              </p>
              <p className="text-sm font-medium text-[#0E1F35]">
                {formatDate(caseData.patient_dob)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Age at Incident
              </p>
              <p className="text-sm font-medium text-[#0E1F35]">
                {caseData.patient_age_at_incident != null
                  ? `${caseData.patient_age_at_incident} years`
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brief Summary Card */}
      {caseData.brief_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0E1F35]">
              Case Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {caseData.brief_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Issues Card */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0E1F35]">
              Key Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {issues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#DFC06A] rounded-full mt-2 shrink-0" />
                  <span className="text-sm text-gray-700">{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Contacts Card */}
      {caseContacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0E1F35] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#DFC06A]" />
              Case Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {caseContacts.map((cc, index) => (
                <div key={cc.id}>
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#0E1F35]">
                          {cc.contacts.first_name} {cc.contacts.last_name}
                        </p>
                        {cc.is_primary && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-[#DFC06A] text-[#DFC06A]"
                          >
                            Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {cc.role.replace(/_/g, ' ')}
                        {cc.contacts.contact_type &&
                          ` -- ${cc.contacts.contact_type.replace(/_/g, ' ')}`}
                      </p>
                      {cc.contacts.organization_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Building className="h-3 w-3" />
                          {cc.contacts.organization_name}
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      {cc.contacts.email && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-end">
                          <Mail className="h-3 w-3" />
                          {cc.contacts.email}
                        </div>
                      )}
                      {cc.contacts.phone_primary && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-end">
                          <Phone className="h-3 w-3" />
                          {cc.contacts.phone_primary}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
