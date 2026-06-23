'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MILESTONE_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { useMilestones, useCreateMilestone, useToggleMilestone } from '@/hooks/useMilestones'
import type { CaseMilestoneInsert } from '@/types/database.types'
import { cn } from '@/lib/utils'
import {
  Plus, ListTodo, Calendar, CheckCircle2, Circle,
  Clock, AlertTriangle, Loader2, Filter,
} from 'lucide-react'

type FilterStatus = 'all' | 'open' | 'completed' | 'overdue'

export default function CaseTasksPage() {
  const params = useParams()
  const caseId = params.id as string
  const { data: milestones = [], isLoading } = useMilestones(caseId)
  const createMilestone = useCreateMilestone()
  const toggleMilestone = useToggleMilestone()

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [createOpen, setCreateOpen] = useState(false)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('other')
  const [newDate, setNewDate] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const now = new Date()

  // Filter milestones
  const filtered = milestones.filter(m => {
    if (statusFilter === 'open') return !m.is_completed
    if (statusFilter === 'completed') return m.is_completed
    if (statusFilter === 'overdue') {
      return !m.is_completed && m.target_date && new Date(m.target_date) < now
    }
    return true
  })

  // Sort: overdue first, then by target_date, completed last
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    const aOverdue = !a.is_completed && a.target_date && new Date(a.target_date) < now
    const bOverdue = !b.is_completed && b.target_date && new Date(b.target_date) < now
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    if (a.target_date && b.target_date) return new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
    if (a.target_date) return -1
    if (b.target_date) return 1
    return a.sort_order - b.sort_order
  })

  // Counts for filter badges
  const openCount = milestones.filter(m => !m.is_completed).length
  const completedCount = milestones.filter(m => m.is_completed).length
  const overdueCount = milestones.filter(m => !m.is_completed && m.target_date && new Date(m.target_date) < now).length

  async function handleCreate() {
    if (!newName.trim()) return
    await createMilestone.mutateAsync({
      case_id: caseId,
      milestone_name: newName.trim(),
      milestone_type: newType as CaseMilestoneInsert['milestone_type'],
      target_date: newDate || null,
      description: newDescription.trim() || null,
      sort_order: milestones.length,
      is_completed: false,
    })
    setNewName('')
    setNewType('other')
    setNewDate('')
    setNewDescription('')
    setCreateOpen(false)
  }

  function isOverdue(m: typeof milestones[0]) {
    return !m.is_completed && m.target_date && new Date(m.target_date) < now
  }

  function isDueSoon(m: typeof milestones[0]) {
    if (m.is_completed || !m.target_date) return false
    const diff = new Date(m.target_date).getTime() - now.getTime()
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000 // within 7 days
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Tasks & Milestones</h2>
          <p className="text-sm text-muted-foreground">
            Track deadlines, milestones, and to-dos for this case
            {!isLoading && ` (${openCount} open, ${completedCount} completed)`}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-name">Task Name</Label>
                <Input
                  id="task-name"
                  placeholder="e.g., Review medical records..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-type">Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger id="task-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MILESTONE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-date">Due Date (optional)</Label>
                <Input
                  id="task-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">Notes (optional)</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Additional details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createMilestone.isPending}
              >
                {createMilestone.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'all' as FilterStatus, label: 'All', count: milestones.length },
          { key: 'open' as FilterStatus, label: 'Open', count: openCount },
          { key: 'overdue' as FilterStatus, label: 'Overdue', count: overdueCount },
          { key: 'completed' as FilterStatus, label: 'Completed', count: completedCount },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              statusFilter === f.key
                ? 'bg-[#0E1F35] text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {f.label}
            {f.count > 0 && (
              <span className={cn(
                'text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                statusFilter === f.key ? 'bg-white/20' : 'bg-background'
              )}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={statusFilter === 'all' ? 'No tasks yet' : `No ${statusFilter} tasks`}
          description={statusFilter === 'all'
            ? 'Add tasks and milestones to track deadlines and progress.'
            : 'Try a different filter.'}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((milestone) => (
            <Card
              key={milestone.id}
              className={cn(
                'transition-colors',
                milestone.is_completed && 'opacity-60',
                isOverdue(milestone) && 'border-red-200 bg-red-50/50',
              )}
            >
              <CardContent className="flex items-start gap-3 py-3">
                <div className="pt-0.5">
                  <Checkbox
                    checked={milestone.is_completed}
                    onCheckedChange={() =>
                      toggleMilestone.mutate({ id: milestone.id, caseId })
                    }
                    className="h-5 w-5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-sm font-medium',
                      milestone.is_completed && 'line-through text-muted-foreground'
                    )}>
                      {milestone.milestone_name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {getLabelForValue(MILESTONE_TYPES, milestone.milestone_type)}
                    </Badge>
                    {isOverdue(milestone) && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />
                        Overdue
                      </Badge>
                    )}
                    {isDueSoon(milestone) && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                        <Clock className="h-3 w-3 mr-0.5" />
                        Due Soon
                      </Badge>
                    )}
                    {milestone.is_completed && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Done
                      </Badge>
                    )}
                  </div>
                  {milestone.description && (
                    <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {milestone.target_date && (
                      <span className={cn(
                        'text-xs flex items-center gap-1',
                        isOverdue(milestone) ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      )}>
                        <Calendar className="h-3 w-3" />
                        Due {formatDate(milestone.target_date)}
                      </span>
                    )}
                    {milestone.completed_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed {formatDate(milestone.completed_at)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
