'use client'

import { useState } from 'react'
import { deriveContractRates, STANDARD_SCOPE } from '@/lib/contract-terms'
import { useBillingRates } from '@/hooks/useBillingRates'
import { useParams } from 'next/navigation'
import { authHeaders } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { SendForSignatureDialog } from '@/components/contracts/SendForSignatureDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  CONTRACT_TYPES,
  CONTRACT_STATUSES,
  getLabelForValue,
  getColorForValue,
} from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { useContracts, useCreateContract, useUpdateContract } from '@/hooks/useContracts'
import { useCaseContacts } from '@/hooks/useCaseContacts'
import { usePortalInvites } from '@/hooks/usePortal'
import type { ContractInsert, ContractRow } from '@/types/database.types'
import {
  Plus,
  ScrollText,
  FileText,
  Eye,
  Download,
  Loader2,
  Pencil,
  Building,
  DollarSign,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'

// Placeholder terms for the very first render. The real quote comes from
// billing_rates and is applied in handleOpenCreate, so a stale constant can
// never reach an agreement.
const DEFAULTS = deriveContractRates(null)

interface ContractFormState {
  contract_type: string
  title: string
  firm_name: string
  firm_contact_name: string
  firm_address: string
  firm_email: string
  firm_phone: string
  hourly_rate: number
  deposition_rate: number
  trial_rate: number
  retainer_amount: number
  cancellation_fee_hours: number
  payment_terms_days: number
  scope_description: string
  additional_terms: string
}

const initialFormState: ContractFormState = {
  contract_type: 'retention_agreement',
  title: 'Expert Witness Retention Agreement',
  firm_name: '',
  firm_contact_name: '',
  firm_address: '',
  firm_email: '',
  firm_phone: '',
  hourly_rate: DEFAULTS.hourlyRate,
  deposition_rate: DEFAULTS.depositionRate,
  trial_rate: DEFAULTS.trialRate,
  retainer_amount: DEFAULTS.retainerAmount,
  cancellation_fee_hours: DEFAULTS.cancellationFeeHours,
  payment_terms_days: DEFAULTS.paymentTermsDays,
  scope_description: STANDARD_SCOPE,
  additional_terms: '',
}

function ContractPreviewDialog({
  html,
  open,
  onOpenChange,
  onExportPDF,
  isSigned,
  signedBy,
  signedAt,
  loading,
}: {
  html: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onExportPDF: () => void
  isSigned?: boolean
  signedBy?: string | null
  signedAt?: string | null
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <span>Contract Preview</span>
              {isSigned && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                  ✓ Signed{signedBy ? ` by ${signedBy}` : ''}
                  {signedAt ? ` on ${formatDate(signedAt)}` : ''}
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={onExportPDF} disabled={loading || !html}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[#0E1F35]" />
            </div>
          ) : (
            <iframe
              srcDoc={html}
              className="w-full border-0"
              style={{ height: '80vh' }}
              title="Contract Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CaseContractsPage() {
  const params = useParams()
  const caseId = params.id as string

  const { data: contracts, isLoading, refetch: refetchContracts } = useContracts(caseId)
  const { data: caseContacts = [] } = useCaseContacts(caseId)
  const { data: portalInvites = [] } = usePortalInvites(caseId)
  const createContract = useCreateContract()
  const updateContract = useUpdateContract()

  const [createOpen, setCreateOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewSigned, setPreviewSigned] = useState(false)
  const [previewSignedBy, setPreviewSignedBy] = useState<string | null>(null)
  const [previewSignedAt, setPreviewSignedAt] = useState<string | null>(null)
  const { data: billingRates } = useBillingRates()
  const [form, setForm] = useState<ContractFormState>(initialFormState)
  const [generating, setGenerating] = useState(false)
  const [editingContractId, setEditingContractId] = useState<string | null>(null)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signContractId, setSignContractId] = useState<string>('')
  const [signContractTitle, setSignContractTitle] = useState<string>('')

  // Auto-populate from first retaining attorney contact
  function populateFromContacts() {
    const retaining = caseContacts.find(
      (cc) => cc.role === 'retaining_attorney' && cc.contacts
    )
    if (retaining?.contacts) {
      const c = retaining.contacts
      setForm((prev) => ({
        ...prev,
        firm_name: c.organization_name || '',
        firm_contact_name: `${c.first_name} ${c.last_name}`.trim(),
        firm_email: c.email || '',
        firm_phone: c.phone_primary || '',
        firm_address: [c.address_street, c.address_city, c.address_state, c.address_zip]
          .filter(Boolean)
          .join(', '),
      }))
    }
  }

  function handleOpenCreate() {
    const standard = deriveContractRates(billingRates)
    setForm({
      ...initialFormState,
      hourly_rate: standard.hourlyRate,
      deposition_rate: standard.depositionRate,
      trial_rate: standard.trialRate,
      retainer_amount: standard.retainerAmount,
      cancellation_fee_hours: standard.cancellationFeeHours,
      payment_terms_days: standard.paymentTermsDays,
    })
    setEditingContractId(null)
    setCreateOpen(true)
    // Defer auto-populate
    setTimeout(populateFromContacts, 0)
  }

  function handleEditContract(contract: ContractRow) {
    setForm({
      contract_type: contract.contract_type,
      title: contract.title,
      firm_name: contract.firm_name || '',
      firm_contact_name: contract.firm_contact_name || '',
      firm_address: contract.firm_address || '',
      firm_email: contract.firm_email || '',
      firm_phone: contract.firm_phone || '',
      hourly_rate: contract.hourly_rate,
      deposition_rate: contract.deposition_rate,
      trial_rate: contract.trial_rate,
      retainer_amount: contract.retainer_amount,
      cancellation_fee_hours: contract.cancellation_fee_hours,
      payment_terms_days: contract.payment_terms_days,
      scope_description: contract.scope_description || STANDARD_SCOPE,
      additional_terms: contract.additional_terms || '',
    })
    setEditingContractId(contract.id)
    setCreateOpen(true)
  }

  async function handleGenerate() {
    if (!form.title.trim()) {
      toast.error('Please provide a contract title')
      return
    }

    setGenerating(true)
    try {
      let contractId: string

      if (editingContractId) {
        // Update existing contract
        await updateContract.mutateAsync({
          id: editingContractId,
          data: {
            contract_type: form.contract_type,
            title: form.title,
            firm_name: form.firm_name || null,
            firm_contact_name: form.firm_contact_name || null,
            firm_address: form.firm_address || null,
            firm_email: form.firm_email || null,
            firm_phone: form.firm_phone || null,
            hourly_rate: form.hourly_rate,
            deposition_rate: form.deposition_rate,
            trial_rate: form.trial_rate,
            retainer_amount: form.retainer_amount,
            cancellation_fee_hours: form.cancellation_fee_hours,
            payment_terms_days: form.payment_terms_days,
            scope_description: form.scope_description || STANDARD_SCOPE,
            additional_terms: form.additional_terms || null,
          },
        })
        contractId = editingContractId
      } else {
        // Create new contract
        const input: ContractInsert = {
          case_id: caseId,
          contract_type: form.contract_type,
          title: form.title,
          firm_name: form.firm_name || null,
          firm_contact_name: form.firm_contact_name || null,
          firm_address: form.firm_address || null,
          firm_email: form.firm_email || null,
          firm_phone: form.firm_phone || null,
          hourly_rate: form.hourly_rate,
          deposition_rate: form.deposition_rate,
          trial_rate: form.trial_rate,
          retainer_amount: form.retainer_amount,
          cancellation_fee_hours: form.cancellation_fee_hours,
          payment_terms_days: form.payment_terms_days,
          scope_description: form.scope_description || STANDARD_SCOPE,
          additional_terms: form.additional_terms || null,
        }
        const created = await createContract.mutateAsync(input)
        contractId = created.id
      }

      // Generate HTML
      const res = await fetch('/api/contracts/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ contractId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate contract')
      }

      const { html } = await res.json()
      setPreviewHtml(html)
      setCreateOpen(false)
      setPreviewOpen(true)
      toast.success('Contract generated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate contract')
    } finally {
      setGenerating(false)
    }
  }

  async function handleViewContract(contract: ContractRow) {
    if (!contract.rendered_html) {
      toast.info('No preview available. Edit and generate this contract first.')
      return
    }

    setPreviewSignedBy(contract.signed_by || null)
    setPreviewSignedAt(contract.signed_at || null)

    if (contract.signed_at && contract.signature_data) {
      // Fetch signed version with embedded signature
      setPreviewSigned(true)
      setPreviewLoading(true)
      setPreviewOpen(true)
      try {
        const res = await fetch('/api/contracts/export-signed-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ contractId: contract.id }),
        })
        if (res.ok) {
          const { html } = await res.json()
          setPreviewHtml(html)
        } else {
          // Fall back to unsigned HTML
          setPreviewHtml(contract.rendered_html)
        }
      } catch {
        setPreviewHtml(contract.rendered_html)
      } finally {
        setPreviewLoading(false)
      }
    } else {
      setPreviewSigned(false)
      setPreviewHtml(contract.rendered_html)
      setPreviewOpen(true)
    }
  }

  function handleExportPDF() {
    // Open in new window for print/save as PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(previewHtml)
      printWindow.document.close()
      // Add a slight delay to let styles load, then trigger print
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  if (isLoading) return <LoadingSpinner className="py-12" />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Contracts</h2>
          <p className="text-sm text-muted-foreground">
            Generate and manage retention agreements and engagement letters
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Contracts List */}
      {contracts && contracts.length > 0 ? (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="p-2 rounded-md bg-muted">
                  <ScrollText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{contract.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {getLabelForValue(CONTRACT_TYPES, contract.contract_type)}
                    </Badge>
                    <StatusBadge
                      label={getLabelForValue(CONTRACT_STATUSES, contract.status)}
                      color={getColorForValue(CONTRACT_STATUSES, contract.status)}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {contract.signed_at && (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        Signed {formatDate(contract.signed_at)} by {contract.signed_by}
                      </span>
                    )}
                    {contract.sent_via_portal && !contract.signed_at && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Send className="h-3 w-3" />
                        Sent via Portal
                      </span>
                    )}
                    {contract.firm_name && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building className="h-3 w-3" />
                        {contract.firm_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(contract.hourly_rate)}/hr
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(contract.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewContract(contract)}
                    disabled={!contract.rendered_html}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {contract.signed_at ? 'View Signed' : 'Preview'}
                  </Button>
                  {contract.rendered_html && contract.status !== 'signed' && (
                    <Button
                      size="sm"
                      className="bg-[#DFC06A] hover:bg-[#DFC06A]/90 text-[#0E1F35]"
                      onClick={() => {
                        setSignContractId(contract.id)
                        setSignContractTitle(contract.title)
                        setSignDialogOpen(true)
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send for Signature
                    </Button>
                  )}
                  {contract.status !== 'signed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditContract(contract)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ScrollText}
          title="No contracts yet"
          description="Create a retention agreement or engagement letter for this case. Contract details will auto-populate from case contacts."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          }
        />
      )}

      {/* Create/Edit Contract Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContractId ? 'Edit Contract' : 'New Contract'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Contract Type & Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract Type</Label>
                <Select
                  value={form.contract_type}
                  onValueChange={(v) => setForm((p) => ({ ...p, contract_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Expert Witness Retention Agreement"
                />
              </div>
            </div>

            {/* Firm / Party Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Retaining Party
                </h3>
                {caseContacts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={populateFromContacts}
                  >
                    Auto-fill from Contacts
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Firm Name</Label>
                  <Input
                    value={form.firm_name}
                    onChange={(e) => setForm((p) => ({ ...p, firm_name: e.target.value }))}
                    placeholder="Smith & Associates, LLP"
                  />
                </div>
                <div>
                  <Label>Attorney Name</Label>
                  <Input
                    value={form.firm_contact_name}
                    onChange={(e) => setForm((p) => ({ ...p, firm_contact_name: e.target.value }))}
                    placeholder="Jane Smith, Esq."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Firm Address</Label>
                  <Input
                    value={form.firm_address}
                    onChange={(e) => setForm((p) => ({ ...p, firm_address: e.target.value }))}
                    placeholder="123 Main St, Suite 400, Dallas, TX 75201"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.firm_email}
                    onChange={(e) => setForm((p) => ({ ...p, firm_email: e.target.value }))}
                    placeholder="jane@smithlaw.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.firm_phone}
                    onChange={(e) => setForm((p) => ({ ...p, firm_phone: e.target.value }))}
                    placeholder="(214) 555-1234"
                  />
                </div>
              </div>
            </div>

            {/* Financial Terms */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Financial Terms
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Hourly Rate ($)</Label>
                  <Input
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, hourly_rate: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Deposition Rate ($/day)</Label>
                  <Input
                    type="number"
                    value={form.deposition_rate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, deposition_rate: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Trial Rate ($/day)</Label>
                  <Input
                    type="number"
                    value={form.trial_rate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, trial_rate: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Retainer Amount ($)</Label>
                  <Input
                    type="number"
                    value={form.retainer_amount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, retainer_amount: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Cancellation Notice (hrs)</Label>
                  <Input
                    type="number"
                    value={form.cancellation_fee_hours}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        cancellation_fee_hours: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Payment Terms (days)</Label>
                  <Input
                    type="number"
                    value={form.payment_terms_days}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        payment_terms_days: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Additional Content */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Additional Content
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Scope Description (optional)</Label>
                  <Textarea
                    value={form.scope_description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, scope_description: e.target.value }))
                    }
                    placeholder="Describe the specific scope of the engagement..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Additional Terms (optional)</Label>
                  <Textarea
                    value={form.additional_terms}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, additional_terms: e.target.value }))
                    }
                    placeholder="Any special provisions or additional terms..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {editingContractId ? 'Update & Generate' : 'Create & Generate'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <ContractPreviewDialog
        html={previewHtml}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onExportPDF={handleExportPDF}
        isSigned={previewSigned}
        signedBy={previewSignedBy}
        signedAt={previewSignedAt}
        loading={previewLoading}
      />

      {/* Send for Signature Dialog */}
      <SendForSignatureDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        contractId={signContractId}
        contractTitle={signContractTitle}
        caseId={caseId}
        caseContacts={caseContacts}
        portalInvites={portalInvites as Array<{ id: string; contact_id: string; is_active: boolean; can_sign_contract: boolean; contract_id: string | null }>}
        onSent={() => refetchContracts()}
      />
    </div>
  )
}
