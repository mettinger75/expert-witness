'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBillingRates } from '@/hooks/useBillingRates'
import { deriveContractRates } from '@/lib/contract-terms'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, User, DollarSign, Sparkles } from 'lucide-react'

// Profile schema
const profileSchema = z.object({
  expert_name: z.string().min(1, 'Name is required'),
  credentials: z.string().optional(),
  specialty: z.string().optional(),
  business_name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
})

// Billing schema
const billingSchema = z.object({
  default_hourly_rate: z.coerce.number().min(0, 'Rate must be non-negative'),
  default_payment_terms: z.string().optional(),
  invoice_prefix: z.string().optional(),
})

// AI schema
const aiSchema = z.object({
  default_model: z.string().min(1, 'Model is required'),
  temperature: z.coerce.number().min(0).max(2),
  max_tokens: z.coerce.number().int().positive(),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type BillingFormValues = z.infer<typeof billingSchema>
type AIFormValues = z.infer<typeof aiSchema>

interface SettingsFormProps {
  initialProfile?: Partial<ProfileFormValues>
  initialBilling?: Partial<BillingFormValues>
  initialAI?: Partial<AIFormValues>
  onSaveProfile?: (data: ProfileFormValues) => Promise<void>
  onSaveBilling?: (data: BillingFormValues) => Promise<void>
  onSaveAI?: (data: AIFormValues) => Promise<void>
}

export function SettingsForm({
  initialProfile,
  initialBilling,
  initialAI,
  onSaveProfile,
  onSaveBilling,
  onSaveAI,
}: SettingsFormProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      expert_name: initialProfile?.expert_name ?? '',
      credentials: initialProfile?.credentials ?? '',
      specialty: initialProfile?.specialty ?? '',
      business_name: initialProfile?.business_name ?? '',
      address: initialProfile?.address ?? '',
      phone: initialProfile?.phone ?? '',
      email: initialProfile?.email ?? '',
      website: initialProfile?.website ?? '',
    },
  })

  // Billing form — falls back to the billing_rates quote rather than a stale
  // literal, so an unset practice default never displays a rate we do not charge.
  const { data: billingRates } = useBillingRates()
  const standardHourlyRate = deriveContractRates(billingRates).hourlyRate
  const billingForm = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema) as any,
    defaultValues: {
      default_hourly_rate: initialBilling?.default_hourly_rate ?? standardHourlyRate,
      default_payment_terms: initialBilling?.default_payment_terms ?? 'Net 30',
      invoice_prefix: initialBilling?.invoice_prefix ?? 'INV',
    },
  })

  // AI form
  const aiForm = useForm<AIFormValues>({
    resolver: zodResolver(aiSchema) as any,
    defaultValues: {
      default_model: initialAI?.default_model ?? 'claude-sonnet-4-20250514',
      temperature: initialAI?.temperature ?? 0.7,
      max_tokens: initialAI?.max_tokens ?? 4096,
    },
  })

  async function handleSaveProfile(values: ProfileFormValues) {
    setIsSaving(true)
    try {
      await onSaveProfile?.(values)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveBilling(values: BillingFormValues) {
    setIsSaving(true)
    try {
      await onSaveBilling?.(values)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveAI(values: AIFormValues) {
    setIsSaving(true)
    try {
      await onSaveAI?.(values)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="profile" className="gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="billing" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Billing Defaults
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Configuration
        </TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile">
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Expert Profile</CardTitle>
                <CardDescription>
                  Your professional information used on reports and invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="expert_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expert Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. John Smith, MD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="credentials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credentials</FormLabel>
                        <FormControl>
                          <Input placeholder="MD, MBA, FASA" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialty</FormLabel>
                        <FormControl>
                          <Input placeholder="Anesthesiology" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith Expert Consulting, LLC" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Medical Center Drive, Suite 400, City, ST 12345" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="expert@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>

      {/* Billing Tab */}
      <TabsContent value="billing">
        <Form {...billingForm}>
          <form onSubmit={billingForm.handleSubmit(handleSaveBilling)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing Defaults</CardTitle>
                <CardDescription>
                  Default billing settings applied to new cases and invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={billingForm.control}
                    name="default_hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="25" min="0" {...field} />
                        </FormControl>
                        <FormDescription>Applied to new time entries</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={billingForm.control}
                    name="default_payment_terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                            <SelectItem value="Net 15">Net 15</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 45">Net 45</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={billingForm.control}
                    name="invoice_prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Prefix</FormLabel>
                        <FormControl>
                          <Input placeholder="INV" {...field} />
                        </FormControl>
                        <FormDescription>e.g., INV-2026-0001</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Billing Settings
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>

      {/* AI Configuration Tab */}
      <TabsContent value="ai">
        <Form {...aiForm}>
          <form onSubmit={aiForm.handleSubmit(handleSaveAI)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>
                  Configure default AI model settings for report generation and analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={aiForm.control}
                  name="default_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Model</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                          <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The AI model used for report generation and case analysis.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={aiForm.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature ({field.value})</FormLabel>
                        <FormControl>
                          <Input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            className="cursor-pointer"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower = more focused, Higher = more creative. Recommended: 0.3-0.7 for reports.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={aiForm.control}
                    name="max_tokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Tokens</FormLabel>
                        <FormControl>
                          <Input type="number" min="256" max="32768" step="256" {...field} />
                        </FormControl>
                        <FormDescription>
                          Maximum length of AI responses. 4096 is typically sufficient.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save AI Settings
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  )
}
