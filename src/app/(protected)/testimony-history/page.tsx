'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/formatters'
import {
  useTestimonyHistory,
  useCreateTestimonyHistory,
  useUpdateTestimonyHistory,
  useDeleteTestimonyHistory,
} from '@/hooks/useTestimonyHistory'
import type {
  TestimonyHistoryRow,
  TestimonyHistoryInsert,
  TestimonyType,
  TestimonySide,
} from '@/services/testimonyHistory.service'
import { Gavel, Plus, Edit, Trash2, FileDown, Download, Loader2 } from 'lucide-react'

const TYPE_OPTIONS: { value: TestimonyType; label: string }[] = [
  { value: 'deposition', label: 'Deposition' },
  { value: 'trial', label: 'Trial' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'arbitration', label: 'Arbitration' },
]

const SIDE_OPTIONS: { value: TestimonySide; label: string }[] = [
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'defense', label: 'Defense' },
  { value: 'unknown', label: 'Unknown' },
]

const EMPTY_FORM: TestimonyHistoryInsert = {
  case_caption: '',
  case_number: '',
  court_venue: '',
  jurisdiction: '',
  testimony_date: new Date().toISOString().slice(0, 10),
  testimony_type: 'deposition',
  side_retained_by: 'plaintiff',
  retaining_attorney: '',
  retaining_firm: '',
  notes: '',
  is_published: true,
  source: 'manual',
}

export default function TestimonyHistoryPage() {
  const [yearsBack, setYearsBack] = useState(4)
  const [filterType, setFilterType] = useState<string>('all')
  const { data: entries = [], isLoading } = useTestimonyHistory({
    yearsBack: yearsBack > 0 ? yearsBack : undefined,
    type: filterType !== 'all' ? (filterType as TestimonyType) : undefined,
  })

  const createMutation = useCreateTestimonyHistory()
  const updateMutation = useUpdateTestimonyHistory()
  const deleteMutation = useDeleteTestimonyHistory()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TestimonyHistoryInsert>(EMPTY_FORM)

  const stats = useMemo(() => {
    const total = entries.length
    const depo = entries.filter((e) => e.testimony_type === 'deposition').length
    const trial = entries.filter((e) => e.testimony_type === 'trial').length
    const plaintiff = entries.filter((e) => e.side_retained_by === 'plaintiff').length
    const defense = entries.filter((e) => e.side_retained_by === 'defense').length
    return { total, depo, trial, plaintiff, defense }
  }, [entries])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(entry: TestimonyHistoryRow) {
    setEditingId(entry.id)
    setForm({
      case_id: entry.case_id,
      deposition_id: entry.deposition_id,
      case_caption: entry.case_caption,
      case_number: entry.case_number ?? '',
      court_venue: entry.court_venue ?? '',
      jurisdiction: entry.jurisdiction ?? '',
      testimony_date: entry.testimony_date,
      testimony_type: entry.testimony_type,
      side_retained_by: entry.side_retained_by,
      retaining_attorney: entry.retaining_attorney ?? '',
      retaining_firm: entry.retaining_firm ?? '',
      notes: entry.notes ?? '',
      is_published: entry.is_published,
      source: entry.source,
    })
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (!form.case_caption.trim() || !form.testimony_date) return
    const payload = {
      ...form,
      case_caption: form.case_caption.trim(),
      case_number: form.case_number?.trim() || null,
      court_venue: form.court_venue?.trim() || null,
      jurisdiction: form.jurisdiction?.trim() || null,
      retaining_attorney: form.retaining_attorney?.trim() || null,
      retaining_firm: form.retaining_firm?.trim() || null,
      notes: form.notes?.trim() || null,
    }
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => setDialogOpen(false) }
      )
    } else {
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }

  function handleDelete(id: string) {
    if (confirm('Delete this testimony entry? This cannot be undone.')) {
      deleteMutation.mutate(id)
    }
  }

  function openPdfPreview() {
    window.open(`/api/testimony-history/html?years=${yearsBack}`, '_blank')
  }

  function downloadCsv() {
    window.location.href = `/api/testimony-history/csv?years=${yearsBack}`
  }

  return (
    <div>
      <PageHeader
        title="Testimony History"
        description="Manage prior deposition and trial testimony for FRCP 26(a)(2)(B)(v) disclosures."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={openPdfPreview}>
              <FileDown className="h-4 w-4 mr-2" />
              PDF Preview
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="py-3"><div className="text-2xl font-bold text-[#0E1F35]">{stats.total}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
        <Card><CardContent className="py-3"><div className="text-2xl font-bold text-[#0E1F35]">{stats.depo}</div><div className="text-xs text-muted-foreground">Depositions</div></CardContent></Card>
        <Card><CardContent className="py-3"><div className="text-2xl font-bold text-[#DFC06A]">{stats.trial}</div><div className="text-xs text-muted-foreground">Trials</div></CardContent></Card>
        <Card><CardContent className="py-3"><div className="text-2xl font-bold text-emerald-700">{stats.plaintiff}</div><div className="text-xs text-muted-foreground">Plaintiff</div></CardContent></Card>
        <Card><CardContent className="py-3"><div className="text-2xl font-bold text-blue-700">{stats.defense}</div><div className="text-xs text-muted-foreground">Defense</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end mb-4">
        <div>
          <Label htmlFor="years">Window (years)</Label>
          <Input
            id="years"
            type="number"
            min={1}
            max={20}
            className="w-24"
            value={yearsBack}
            onChange={(e) => setYearsBack(parseInt(e.target.value, 10) || 4)}
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No testimony recorded"
          description={`No testimony entries within the last ${yearsBack} years. Add prior testimony to build the disclosure list.`}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Case Caption</TableHead>
                  <TableHead>Court / Venue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Retained By</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(e.testimony_date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{e.case_caption}</div>
                      {e.case_number && (
                        <div className="text-xs text-muted-foreground">No. {e.case_number}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{e.court_venue ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={e.testimony_type === 'trial' ? 'default' : 'secondary'} className="capitalize">
                        {e.testimony_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{e.side_retained_by}</TableCell>
                    <TableCell className="text-sm">
                      {e.retaining_attorney && <div>{e.retaining_attorney}</div>}
                      {e.retaining_firm && <div className="text-xs text-muted-foreground">{e.retaining_firm}</div>}
                      {!e.retaining_attorney && !e.retaining_firm && '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={e.is_published}
                        onCheckedChange={(v) =>
                          updateMutation.mutate({ id: e.id, data: { is_published: v } })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Testimony Entry' : 'Add Testimony Entry'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label htmlFor="case_caption">Case Caption *</Label>
              <Input
                id="case_caption"
                placeholder="e.g., Smith v. Memorial Hospital"
                value={form.case_caption}
                onChange={(e) => setForm({ ...form, case_caption: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="case_number">Case / Docket Number</Label>
              <Input
                id="case_number"
                value={form.case_number ?? ''}
                onChange={(e) => setForm({ ...form, case_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="testimony_date">Date *</Label>
              <Input
                id="testimony_date"
                type="date"
                value={form.testimony_date}
                onChange={(e) => setForm({ ...form, testimony_date: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="court_venue">Court / Venue</Label>
              <Input
                id="court_venue"
                placeholder="e.g., U.S. District Court, N.D. Texas"
                value={form.court_venue ?? ''}
                onChange={(e) => setForm({ ...form, court_venue: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                placeholder="State / Federal"
                value={form.jurisdiction ?? ''}
                onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="testimony_type">Type *</Label>
              <Select value={form.testimony_type} onValueChange={(v) => setForm({ ...form, testimony_type: v as TestimonyType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="side">Side Retained By *</Label>
              <Select value={form.side_retained_by} onValueChange={(v) => setForm({ ...form, side_retained_by: v as TestimonySide })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIDE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="retaining_attorney">Retaining Attorney</Label>
              <Input
                id="retaining_attorney"
                value={form.retaining_attorney ?? ''}
                onChange={(e) => setForm({ ...form, retaining_attorney: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="retaining_firm">Retaining Firm</Label>
              <Input
                id="retaining_firm"
                value={form.retaining_firm ?? ''}
                onChange={(e) => setForm({ ...form, retaining_firm: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={form.is_published ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
              <Label>Include in public/portal disclosure list</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : editingId ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
