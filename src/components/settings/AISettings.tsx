'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AISettingsData {
  defaultModel: string
  temperature: string
  autoSummarize: boolean
  autoTimeline: boolean
  includeCitations: boolean
}

const DEFAULT_AI: AISettingsData = {
  defaultModel: 'claude-sonnet-4',
  temperature: '0.3',
  autoSummarize: true,
  autoTimeline: true,
  includeCitations: true,
}

export function AISettings() {
  const [settings, setSettings] = useState<AISettingsData>(DEFAULT_AI)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/options')
      .then((r) => r.json())
      .then((data) => {
        if (data['options.ai_settings']) {
          setSettings((prev) => ({ ...prev, ...data['options.ai_settings'] }))
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'options.ai_settings',
          options: settings as unknown as Array<{ value: string; label: string; is_active: boolean; sort_order: number }>,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('AI settings saved')
    } catch {
      toast.error('Failed to save AI settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Model</Label>
            <Select
              value={settings.defaultModel}
              onValueChange={(v) => setSettings((p) => ({ ...p, defaultModel: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-haiku-4-5">Claude Haiku 4.5 (Fast)</SelectItem>
                <SelectItem value="claude-sonnet-4">Claude Sonnet 4 (Standard)</SelectItem>
                <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5 (Advanced)</SelectItem>
                <SelectItem value="claude-opus-4-5">Claude Opus 4.5 (Research)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={settings.temperature}
              onChange={(e) => setSettings((p) => ({ ...p, temperature: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower values produce more focused, deterministic output. Recommended: 0.2-0.4 for medical-legal work.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-summarize uploaded documents</Label>
              <p className="text-xs text-muted-foreground">
                Automatically generate AI summaries when documents are uploaded.
              </p>
            </div>
            <Switch
              checked={settings.autoSummarize}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, autoSummarize: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-generate timeline entries</Label>
              <p className="text-xs text-muted-foreground">
                Extract timeline events from uploaded medical records.
              </p>
            </div>
            <Switch
              checked={settings.autoTimeline}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, autoTimeline: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Include citations in AI responses</Label>
              <p className="text-xs text-muted-foreground">
                AI will reference specific documents and page numbers in responses.
              </p>
            </div>
            <Switch
              checked={settings.includeCitations}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, includeCitations: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save AI Settings
        </Button>
      </div>
    </div>
  )
}
