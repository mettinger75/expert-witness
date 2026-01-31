'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Switch } from '@/components/ui/switch'
import { User, DollarSign, Brain, Save } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your expert witness practice settings"
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expert Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" defaultValue="Mark" />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" defaultValue="Ettinger" />
                </div>
              </div>
              <div>
                <Label htmlFor="credentials">Credentials</Label>
                <Input id="credentials" defaultValue="MD" placeholder="e.g., MD, DO, PhD" />
              </div>
              <div>
                <Label htmlFor="specialty">Primary Specialty</Label>
                <Input id="specialty" defaultValue="Anesthesiology" />
              </div>
              <div>
                <Label htmlFor="subspecialties">Subspecialties</Label>
                <Input id="subspecialties" placeholder="e.g., Pain Management, Critical Care" />
              </div>
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Brief professional biography for reports..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="practice-name">Practice Name</Label>
                <Input id="practice-name" placeholder="Expert Witness Practice Name" />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input id="zip" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate-review">Record Review Rate ($/hr)</Label>
                  <Input id="rate-review" type="number" defaultValue="500" />
                </div>
                <div>
                  <Label htmlFor="rate-deposition">Deposition Rate ($/hr)</Label>
                  <Input id="rate-deposition" type="number" defaultValue="750" />
                </div>
                <div>
                  <Label htmlFor="rate-trial">Trial Testimony Rate ($/hr)</Label>
                  <Input id="rate-trial" type="number" defaultValue="750" />
                </div>
                <div>
                  <Label htmlFor="rate-travel">Travel Rate ($/hr)</Label>
                  <Input id="rate-travel" type="number" defaultValue="250" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invoice-prefix">Invoice Number Prefix</Label>
                <Input id="invoice-prefix" defaultValue="INV" />
              </div>
              <div>
                <Label htmlFor="payment-terms">Default Payment Terms</Label>
                <Select defaultValue="net30">
                  <SelectTrigger id="payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    <SelectItem value="net15">Net 15</SelectItem>
                    <SelectItem value="net30">Net 30</SelectItem>
                    <SelectItem value="net45">Net 45</SelectItem>
                    <SelectItem value="net60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice-notes">Default Invoice Notes</Label>
                <Textarea
                  id="invoice-notes"
                  rows={3}
                  defaultValue="Payment due within 30 days of receipt. Thank you for your business."
                />
              </div>
              <div>
                <Label htmlFor="retainer-amount">Default Retainer Amount</Label>
                <Input id="retainer-amount" type="number" defaultValue="5000" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Billing Settings
            </Button>
          </div>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  defaultValue="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  placeholder="Enter your API key"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your API key is encrypted and stored securely.
                </p>
              </div>
              <div>
                <Label htmlFor="default-model">Default Model</Label>
                <Select defaultValue="gpt-4o">
                  <SelectTrigger id="default-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (Standard)</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  defaultValue="0.3"
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
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-generate timeline entries</Label>
                  <p className="text-xs text-muted-foreground">
                    Extract timeline events from uploaded medical records.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Include citations in AI responses</Label>
                  <p className="text-xs text-muted-foreground">
                    AI will reference specific documents and page numbers in responses.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save AI Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
