'use client'

import { useParams } from 'next/navigation'
import { useCase, useUpdateCase, useSynthesizeCase, useNotionPull, useNotionPush } from '@/hooks/useCases'
import { useCaseContacts } from '@/hooks/useCaseContacts'
import { useMilestones } from '@/hooks/useMilestones'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { CASE_STATUSES, CASE_TYPES, CASE_PRIORITIES, SPECIALTY_AREAS, CASE_CONTACT_ROLES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatCurrency, formatDuration } from '@/lib/formatters'
import { Calendar, DollarSign, Clock, Scale, User, MapPin, Edit, Users, CheckSquare, Mail, Phone, Building, Brain, RefreshCw, Loader2, AlertTriangle, ExternalLink, ArrowDownToLine, ArrowUpFromLine, Link2 } from 'lucide-react'
import type { CaseStatus } from '@/types/enums'
import { useState } from 'react'
import Link from 'next/link'
import { useToggleMilestone } from '@/hooks/useMilestones'
import { CreatePortalInviteDialog } from '@/components/portal/CreatePortalInviteDialog'
import { PortalMessagesPanel } from '@/components/portal/PortalMessagesPanel'

export default function CaseOverviewPage() {
  const params = useParams()
  const caseId = params.id as string
  const { data: caseData, isLoading } = useCase(caseId)
  const { data: caseContacts = [] } = useCaseContacts(caseId)
  const { data: milestones = [] } = useMilestones(caseId)
  const updateCase = useUpdateCase()
  const synthesizeCase = useSynthesizeCase()
  const notionPull = useNotionPull()
  const notionPush = useNotionPush()
  const toggleMilestone = useToggleMilestone()
  const [editingStatus, setEditingStatus] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineDesc, setDeadlineDesc] = useState('')
  const [portalInviteOpen, setPortalInviteOpen] = useState(false)
  const [portalContactId, setPortalContactId] = useState<string | undefined>()
  const [portalContactName, setPortalContactName] = useState<string | undefined>()

  if (isLoading || !caseData) return <LoadingSpinner className="py-12" />

  const outstandingMilestones = milestones.filter((m) => !m.is_completed)

  function handleStatusChange(newStatus: string) {
    updateCase.mutate({ id: caseId, data: { status: newStatus as CaseStatus } })
    setEditingStatus(false)
  }

  function openDeadlineEdit() {
    setDeadlineDate(caseData?.deadline_next || '')
    setDeadlineDesc(caseData?.deadline_description || '')
    setEditingDeadline(true)
  }

  function handleDeadlineSave() {
    updateCase.mutate({
      id: caseId,
      data: {
        deadline_next: deadlineDate || null,
        deadline_description: deadlineDesc || null,
      },
    })
    setEditingDeadline(false)
  }

  function handleDeadlineClear() {
    updateCase.mutate({
      id: caseId,
      data: {
        deadline_next: null,
        deadline_description: null,
      },
    })
    setEditingDeadline(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content - Left 2 columns */}
      <div className="lg:col-span-2 space-y-6">
        {/* Case Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Case Details</CardTitle>
            <Link href={`/cases/${caseId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Case Type</label>
                <p className="mt-1 font-medium">{getLabelForValue(CASE_TYPES, caseData.case_type)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Specialty</label>
                <p className="mt-1 font-medium">{getLabelForValue(SPECIALTY_AREAS, caseData.specialty_area ?? '')}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Side</label>
                <p className="mt-1 font-medium capitalize">{caseData.side}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
                <div className="mt-1">
                  <StatusBadge
                    label={getLabelForValue(CASE_PRIORITIES, caseData.priority)}
                    color={getColorForValue(CASE_PRIORITIES, caseData.priority)}
                  />
                </div>
              </div>
            </div>

            {caseData.brief_summary && (
              <>
                <Separator />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{caseData.brief_summary}</p>
                </div>
              </>
            )}

            {(caseData.key_issues?.length ?? 0) > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Issues</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {caseData.key_issues!.map((issue: string, i: number) => (
                    <Badge key={i} variant="secondary">{issue}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                <p className="mt-1">{caseData.patient_name || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                <p className="mt-1">{formatDate(caseData.patient_dob)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Age at Incident</label>
                <p className="mt-1">{caseData.patient_age_at_incident ?? '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outcome</label>
                <p className="mt-1 capitalize">{caseData.patient_outcome?.replace('_', ' ') || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts
            </CardTitle>
            <Link href={`/cases/${caseId}/contacts`}>
              <Button variant="outline" size="sm">Manage</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {caseContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts linked to this case yet.</p>
            ) : (
              <div className="space-y-3">
                {caseContacts.map((cc) => {
                  const contact = cc.contacts
                  return (
                    <div key={cc.id} className="flex items-start justify-between border rounded-lg p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="font-medium text-sm hover:underline"
                            style={{ color: '#091525' }}
                          >
                            {contact.first_name} {contact.last_name}
                          </Link>
                          <Badge variant="secondary" className="text-xs">
                            {getLabelForValue(CASE_CONTACT_ROLES, cc.role)}
                          </Badge>
                          {cc.is_primary && (
                            <Badge variant="default" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        {contact.organization && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {contact.organization}
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                            >
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#C9A84C] hover:text-[#0E1F35]"
                        onClick={() => {
                          setPortalContactId(cc.contact_id)
                          setPortalContactName(`${contact.first_name} ${contact.last_name}`)
                          setPortalInviteOpen(true)
                        }}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Portal
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opinion */}
        {(caseData.preliminary_opinion || caseData.opinion_summary) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Opinion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preliminary Opinion</label>
                <p className="mt-1 capitalize">{caseData.preliminary_opinion?.replace('_', ' ') || '-'}</p>
              </div>
              {caseData.opinion_summary && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{caseData.opinion_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Case Analysis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Case Analysis
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => synthesizeCase.mutate(caseId)}
              disabled={synthesizeCase.isPending}
            >
              {synthesizeCase.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {caseData.standard_of_care_issues || caseData.causation_notes || caseData.damages_summary
                    ? 'Re-analyze Case'
                    : 'Analyze Case'}
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!caseData.standard_of_care_issues && !caseData.causation_notes && !caseData.damages_summary ? (
              <div className="text-center py-6 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No AI analysis yet.</p>
                <p className="text-xs mt-1">Upload and process documents, then click &quot;Analyze Case&quot; to generate AI insights.</p>
              </div>
            ) : (
              <>
                {caseData.standard_of_care_issues && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Standard of Care Issues</label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{caseData.standard_of_care_issues}</p>
                  </div>
                )}
                {caseData.causation_notes && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Causation Notes</label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{caseData.causation_notes}</p>
                    </div>
                  </>
                )}
                {caseData.damages_summary && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Damages Summary</label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{caseData.damages_summary}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Right column */}
      <div className="space-y-6">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {editingStatus ? (
              <Select defaultValue={caseData.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-between">
                <StatusBadge
                  label={getLabelForValue(CASE_STATUSES, caseData.status)}
                  color={getColorForValue(CASE_STATUSES, caseData.status)}
                />
                <Button variant="ghost" size="sm" onClick={() => setEditingStatus(true)}>
                  Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notion Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.56 2.35c-.42-.326-.98-.7-2.055-.607L3.62 2.863c-.467.047-.56.28-.374.466l1.213.88zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.887l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933l3.222-.186z"/></svg>
              Notion
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.notion_page_url ? (
              <div className="space-y-3">
                <a
                  href={caseData.notion_page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline truncate"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  Open in Notion
                </a>
                {caseData.notion_last_synced && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {formatDate(caseData.notion_last_synced)}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => notionPull.mutate(caseId)}
                    disabled={notionPull.isPending}
                  >
                    {notionPull.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="h-4 w-4 mr-1" />
                    )}
                    Pull from Notion
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => notionPush.mutate(caseId)}
                    disabled={notionPush.isPending}
                  >
                    {notionPush.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ArrowUpFromLine className="h-4 w-4 mr-1" />
                    )}
                    Push Analysis to Notion
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">No Notion page linked.</p>
                <Link href={`/cases/${caseId}/edit`}>
                  <Button variant="link" size="sm" className="text-xs mt-1">
                    Link a Notion page
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Tasks / Milestones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Tasks
            </CardTitle>
            {milestones.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {outstandingMilestones.length} remaining
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones set for this case.</p>
            ) : outstandingMilestones.length === 0 ? (
              <p className="text-sm text-emerald-600">All milestones completed!</p>
            ) : (
              <div className="space-y-2">
                {outstandingMilestones.slice(0, 5).map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={milestone.is_completed}
                      onCheckedChange={() => toggleMilestone.mutate({ id: milestone.id, caseId })}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{milestone.title}</p>
                      {milestone.due_date && (
                        <p className={`text-xs mt-0.5 ${milestone.is_overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                          {milestone.is_overdue ? 'Overdue: ' : 'Due: '}{formatDate(milestone.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {outstandingMilestones.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{outstandingMilestones.length - 5} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Date of Incident</label>
              <p className="text-sm font-medium">{formatDate(caseData.date_of_incident)}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date of Referral</label>
              <p className="text-sm font-medium">{formatDate(caseData.date_of_referral)}</p>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Next Deadline
                </label>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={openDeadlineEdit}>
                  {caseData.deadline_next ? 'Edit' : 'Set'}
                </Button>
              </div>
              {editingDeadline ? (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                  <input
                    type="text"
                    value={deadlineDesc}
                    onChange={(e) => setDeadlineDesc(e.target.value)}
                    placeholder="Description (e.g., Report due)"
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={handleDeadlineSave}>
                      Save
                    </Button>
                    {caseData.deadline_next && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDeadlineClear}>
                        Clear
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDeadline(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : caseData.deadline_next ? (
                <div>
                  <p className="text-sm font-medium" style={{ color: '#091525' }}>
                    {formatDate(caseData.deadline_next)}
                  </p>
                  {caseData.deadline_description && (
                    <p className="text-xs text-muted-foreground">{caseData.deadline_description}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No deadline set</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Jurisdiction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Jurisdiction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">State</label>
              <p className="text-sm font-medium">{caseData.jurisdiction_state || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Court</label>
              <p className="text-sm font-medium">{caseData.court_name || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Case Number</label>
              <p className="text-sm font-medium">{caseData.court_case_number || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Retainer</span>
              <span className="text-sm font-medium">
                {caseData.retainer_received ? 'Received' : 'Pending'} {formatCurrency(caseData.retainer_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Hours</span>
              <span className="text-sm font-medium">{formatDuration(caseData.actual_hours)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Billed</span>
              <span className="text-sm font-medium">{formatCurrency(caseData.total_billed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Paid</span>
              <span className="text-sm font-medium text-emerald-600">{formatCurrency(caseData.total_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Balance Due</span>
              <span className="text-sm font-bold text-amber-600">{formatCurrency(caseData.outstanding_balance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Portal Messages */}
        <PortalMessagesPanel caseId={caseId} />
      </div>

      {/* Portal Invite Dialog */}
      <CreatePortalInviteDialog
        caseId={caseId}
        contactId={portalContactId}
        contactName={portalContactName}
        open={portalInviteOpen}
        onOpenChange={setPortalInviteOpen}
      />
    </div>
  )
}
