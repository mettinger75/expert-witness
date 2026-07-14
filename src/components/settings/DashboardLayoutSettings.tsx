'use client'

import { useState, useCallback } from 'react'
import { authHeaders } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Save, Loader2, GripVertical, LayoutDashboard } from 'lucide-react'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { OPTION_KEYS } from '@/lib/constants'
import { toast } from 'sonner'

interface DashboardWidget {
  widget: string
  label: string
  is_visible: boolean
  sort_order: number
}

export function DashboardLayoutSettings() {
  const { getOptions, refresh } = useAppOptions()

  const rawWidgets = getOptions(OPTION_KEYS.DASHBOARD_LAYOUT) as unknown as DashboardWidget[]
  const [widgets, setWidgets] = useState<DashboardWidget[]>(
    rawWidgets.length > 0
      ? rawWidgets
      : [
          { widget: 'stat_active_cases', label: 'Active Cases', is_visible: true, sort_order: 0 },
          { widget: 'stat_pending_deadlines', label: 'Pending Deadlines', is_visible: true, sort_order: 1 },
          { widget: 'stat_unbilled_hours', label: 'Unbilled Hours', is_visible: true, sort_order: 2 },
          { widget: 'stat_outstanding_invoices', label: 'Outstanding Invoices', is_visible: true, sort_order: 3 },
          { widget: 'recent_cases', label: 'Recent Cases', is_visible: true, sort_order: 4 },
          { widget: 'upcoming_deadlines', label: 'Upcoming Deadlines', is_visible: true, sort_order: 5 },
        ]
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const toggleVisibility = useCallback((widgetKey: string) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.widget === widgetKey ? { ...w, is_visible: !w.is_visible } : w
      )
    )
    setIsDirty(true)
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index === 0) return
    setWidgets((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next.map((w, i) => ({ ...w, sort_order: i }))
    })
    setIsDirty(true)
  }, [])

  const moveDown = useCallback(
    (index: number) => {
      if (index === widgets.length - 1) return
      setWidgets((prev) => {
        const next = [...prev]
        ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
        return next.map((w, i) => ({ ...w, sort_order: i }))
      })
      setIsDirty(true)
    },
    [widgets.length]
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          settingKey: OPTION_KEYS.DASHBOARD_LAYOUT,
          options: widgets,
        }),
      })
      if (!res.ok) throw new Error()
      await refresh()
      setIsDirty(false)
      toast.success('Dashboard layout saved')
    } catch {
      toast.error('Failed to save dashboard layout')
    } finally {
      setIsSaving(false)
    }
  }, [widgets, refresh])

  const visibleCount = widgets.filter((w) => w.is_visible).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Dashboard Layout</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {visibleCount} of {widgets.length} visible
              </span>
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
          <p className="text-sm text-muted-foreground">
            Configure which widgets appear on your dashboard and their order.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Widget</TableHead>
                <TableHead className="w-[100px]">Visible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {widgets.map((widget, index) => (
                <TableRow
                  key={widget.widget}
                  className={widget.is_visible ? '' : 'opacity-50'}
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
                        disabled={index === widgets.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Label className="font-medium">{widget.label}</Label>
                    <p className="text-xs text-muted-foreground">{widget.widget}</p>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={widget.is_visible}
                      onCheckedChange={() => toggleVisibility(widget.widget)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
