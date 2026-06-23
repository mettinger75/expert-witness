'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CaseMilestoneRow, CaseMilestoneInsert } from '@/types/database.types'
import {
  Plus, ListTodo, Calendar, CheckCircle2,
  Clock, AlertTriangle, Loader2, Briefcase, Search,
} from 'lucide-react'

type FilterStatus = 'all' | 'open' | 'completed' | 'overdue'

interface TaskWithCase extends CaseMilestoneRow {
  cases?: { id: string; case_name: string; case_number: string } | null
}

// Fetch all milestones across all cases
function useAllTasks() {
  return useQuery({
    queryKey: ['milestones', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_milestones')
        .select('*, cases(id, case_name, case_number)')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as TaskWithCase[]
    },
  })
}

// Fetch all cases for the create dropdown
function useCaseList() {
  return useQuery({
    queryKey: ['cases', 'list-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('id, case_name, case_number, status')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export default function TasksHubPage() {
  const { data: tasks = [], isLoading } = useAllTasks()
  const { data: cases = [] } = useCaseList()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('open')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // Create form
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('other')
  const [newDate, setNewDate] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCaseId, setNewCaseId] = useState('')

  const createMutation = useMutation({
    mutationFn: async (input: CaseMilestoneInsert) => {
      const { data, error } = await supabase
        .from('case_milestones')
        .insert(input)
        .select('*, cases(id, case_name, case_number)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
      toast.success('Task created')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const task = tasks.find(t => t.id === id)
      if (!task) throw new Error('Task not found')
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('case_milestones')
        .update({
          is_completed: !task.is_completed,
          completed_at: !task.is_completed ? now : null,
        })
        .eq('id', id)
        .select('*, cases(id, case_name, case_number)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
      toast.success(data.is_completed ? 'Task completed' : 'Task reopened')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const now = new Date()

  // Filter
  const filtered = tasks.filter(m => {
    // Status filter
    if (statusFilter === 'open' && m.is_completed) return false
    if (statusFilter === 'completed' && !m.is_completed) return false
    if (statusFilter === 'overdue') {
      if (m.is_completed || !m.target_date || new Date(m.target_date) >= now) return false
    }
    // Search filter
    if (search) {
      const q = search.toLowerCase()
      const matchName = m.milestone_name?.toLowerCase().includes(q)
      const matchCase = m.cases?.case_name?.toLowerCase().includes(q)
      if (!matchName && !matchCase) return false
    }
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    const aOverdue = !a.is_completed && a.target_date && new Date(a.target_date) < now
    const bOverdue = !b.is_completed && b.target_date && new Date(b.target_date) < now
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    if (a.target_date && b.target_date) return new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
    if (a.target_date) return -1
    if (b.target_date) return 1
    return 0
  })

  // Counts
  const openCount = tasks.filter(m => !m.is_completed).length
  const completedCount = tasks.filter(m => m.is_completed).length
  const overdueCount = tasks.filter(m => !m.is_completed && m.target_date && new Date(m.target_date) < now).length

  async function handleCreate() {
    if (!newName.trim() || !newCaseId) return
    await createMutation.mutateAsync({
      case_id: newCaseId,
      milestone_name: newName.trim(),
      milestone_type: newType as CaseMilestoneInsert['milestone_type'],
      target_date: newDate || null,
      description: newDescription.trim() || null,
      sort_order: tasks.length,
      is_completed: false,
    })
    setNewName('')
    setNewType('other')
    setNewDate('')
    setNewDescription('')
    setNewCaseId('')
    setCreateOpen(false)
  }

  function isOverdue(m: TaskWithCase) {
    return !m.is_completed && m.target_date && new Date(m.target_date) < now
  }

  function isDueSoon(m: TaskWithCase) {
    if (m.is_completed || !m.target_date) return false
    const diff = new Date(m.target_date).getTime() - now.getTime()
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            All tasks and milestones across cases
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Case *</Label>
                <Select value={newCaseId} onValueChange={setNewCaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_number} — {c.case_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Task Name *</Label>
                <Input
                  placeholder="e.g., Review medical records..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
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
                <Label>Due Date (optional)</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
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
                disabled={!newName.trim() || !newCaseId || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-2">
          {([
            { key: 'all' as FilterStatus, label: 'All', count: tasks.length },
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
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={statusFilter === 'open' ? 'No open tasks' : statusFilter === 'all' ? 'No tasks yet' : `No ${statusFilter} tasks`}
          description="Create tasks linked to cases to track deadlines and progress."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => (
            <Card
              key={task.id}
              className={cn(
                'transition-colors',
                task.is_completed && 'opacity-60',
                isOverdue(task) && 'border-red-200 bg-red-50/50',
              )}
            >
              <CardContent className="flex items-start gap-3 py-3">
                <div className="pt-0.5">
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={() => toggleMutation.mutate(task.id)}
                    className="h-5 w-5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-sm font-medium',
                      task.is_completed && 'line-through text-muted-foreground'
                    )}>
                      {task.milestone_name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {getLabelForValue(MILESTONE_TYPES, task.milestone_type)}
                    </Badge>
                    {isOverdue(task) && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />
                        Overdue
                      </Badge>
                    )}
                    {isDueSoon(task) && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                        <Clock className="h-3 w-3 mr-0.5" />
                        Due Soon
                      </Badge>
                    )}
                    {task.is_completed && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Done
                      </Badge>
                    )}
                  </div>
                  {/* Case link */}
                  {task.cases && (
                    <Link
                      href={`/cases/${task.cases.id}/tasks`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <Briefcase className="h-3 w-3" />
                      {task.cases.case_number} — {task.cases.case_name}
                    </Link>
                  )}
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {task.target_date && (
                      <span className={cn(
                        'text-xs flex items-center gap-1',
                        isOverdue(task) ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      )}>
                        <Calendar className="h-3 w-3" />
                        Due {formatDate(task.target_date)}
                      </span>
                    )}
                    {task.completed_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed {formatDate(task.completed_at)}
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
