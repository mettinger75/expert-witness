'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  GripVertical,
  Save,
  Loader2,
} from 'lucide-react'
import { BADGE_COLORS, type OptionItem } from '@/lib/constants'

interface OptionListManagerProps {
  settingKey: string
  title: string
  description?: string
  hasColor?: boolean
  options: OptionItem[]
  onSave: (options: OptionItem[]) => Promise<void>
}

/** Slugify a label into a snake_case value */
function toSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function OptionListManager({
  settingKey,
  title,
  description,
  hasColor = false,
  options: initialOptions,
  onSave,
}: OptionListManagerProps) {
  const [options, setOptions] = useState<OptionItem[]>(initialOptions)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('gray')

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingOption, setEditingOption] = useState<OptionItem | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('gray')

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave(options)
      setIsDirty(false)
      toast.success(`${title} saved successfully`)
    } catch {
      toast.error(`Failed to save ${title.toLowerCase()}`)
    } finally {
      setIsSaving(false)
    }
  }, [options, onSave, title])

  const handleAdd = useCallback(() => {
    if (!newLabel.trim()) return

    const slug = toSlug(newLabel)
    if (options.some((o) => o.value === slug)) {
      toast.error('An option with this value already exists')
      return
    }

    const newOption: OptionItem = {
      value: slug,
      label: newLabel.trim(),
      color: hasColor ? newColor : undefined,
      is_active: true,
      sort_order: options.length,
    }

    setOptions((prev) => [...prev, newOption])
    setIsDirty(true)
    setShowAddDialog(false)
    setNewLabel('')
    setNewColor('gray')
  }, [newLabel, newColor, hasColor, options])

  const handleEdit = useCallback(() => {
    if (!editingOption || !editLabel.trim()) return

    setOptions((prev) =>
      prev.map((o) =>
        o.value === editingOption.value
          ? {
              ...o,
              label: editLabel.trim(),
              color: hasColor ? editColor : o.color,
            }
          : o
      )
    )
    setIsDirty(true)
    setShowEditDialog(false)
    setEditingOption(null)
  }, [editingOption, editLabel, editColor, hasColor])

  const openEdit = useCallback(
    (option: OptionItem) => {
      setEditingOption(option)
      setEditLabel(option.label)
      setEditColor(option.color ?? 'gray')
      setShowEditDialog(true)
    },
    []
  )

  const toggleActive = useCallback((value: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.value === value ? { ...o, is_active: !o.is_active } : o
      )
    )
    setIsDirty(true)
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index === 0) return
    setOptions((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next.map((o, i) => ({ ...o, sort_order: i }))
    })
    setIsDirty(true)
  }, [])

  const moveDown = useCallback(
    (index: number) => {
      if (index === options.length - 1) return
      setOptions((prev) => {
        const next = [...prev]
        ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
        return next.map((o, i) => ({ ...o, sort_order: i }))
      })
      setIsDirty(true)
    },
    [options.length]
  )

  const activeCount = options.filter((o) => o.is_active).length

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {activeCount} active / {options.length} total
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
              {isDirty && (
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="w-[160px]">Value</TableHead>
                {hasColor && <TableHead className="w-[100px]">Color</TableHead>}
                <TableHead className="w-[80px]">Active</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((option, index) => (
                <TableRow
                  key={option.value}
                  className={option.is_active ? '' : 'opacity-50'}
                >
                  <TableCell className="px-1">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveUp(index)}
                        className="text-muted-foreground hover:text-foreground text-[10px] leading-none"
                        disabled={index === 0}
                      >
                        ▲
                      </button>
                      <GripVertical className="h-3 w-3 text-muted-foreground mx-auto" />
                      <button
                        onClick={() => moveDown(index)}
                        className="text-muted-foreground hover:text-foreground text-[10px] leading-none"
                        disabled={index === options.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {option.label}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {option.value}
                    </code>
                  </TableCell>
                  {hasColor && (
                    <TableCell>
                      {option.color && (
                        <StatusBadge
                          label={option.color}
                          color={option.color}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Switch
                      checked={option.is_active}
                      onCheckedChange={() => toggleActive(option.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(option)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleActive(option.value)}
                      >
                        {option.is_active ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {options.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={hasColor ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No options configured. Click "Add" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Option</DialogTitle>
            <DialogDescription>
              Add a new option to {title.toLowerCase()}. The value (slug) is
              auto-generated from the label.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-label">Label</Label>
              <Input
                id="new-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Mediation"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              {newLabel && (
                <p className="text-xs text-muted-foreground mt-1">
                  Value: <code>{toSlug(newLabel)}</code>
                </p>
              )}
            </div>
            {hasColor && (
              <div>
                <Label>Color</Label>
                <Select value={newColor} onValueChange={setNewColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <StatusBadge label={color} color={color} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newLabel.trim()}>
              Add Option
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Option</DialogTitle>
            <DialogDescription>
              Edit the label{hasColor ? ' and color' : ''} of this option. The
              value cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Value (read-only)</Label>
              <Input
                value={editingOption?.value ?? ''}
                disabled
                className="opacity-60"
              />
            </div>
            <div>
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              />
            </div>
            {hasColor && (
              <div>
                <Label>Color</Label>
                <Select value={editColor} onValueChange={setEditColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <StatusBadge label={color} color={color} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editLabel.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
