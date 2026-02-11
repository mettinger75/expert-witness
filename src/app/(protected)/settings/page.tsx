'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  User,
  DollarSign,
  Brain,
  Briefcase,
  Users,
  FileText,
  ScrollText,
  LayoutDashboard,
} from 'lucide-react'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { CaseOptionsSettings } from '@/components/settings/CaseOptionsSettings'
import { ContactsRolesSettings } from '@/components/settings/ContactsRolesSettings'
import { DocumentsTimelineSettings } from '@/components/settings/DocumentsTimelineSettings'
import { BillingSettings } from '@/components/settings/BillingSettings'
import { ReportsContractsSettings } from '@/components/settings/ReportsContractsSettings'
import { DashboardLayoutSettings } from '@/components/settings/DashboardLayoutSettings'
import { AISettings } from '@/components/settings/AISettings'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your expert witness practice settings"
      />

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-1.5 text-xs">
            <Briefcase className="h-3.5 w-3.5" />
            Case Options
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Contacts & Roles
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Documents & Timeline
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs">
            <ScrollText className="h-3.5 w-3.5" />
            Reports & Contracts
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" />
            AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="cases" className="mt-6">
          <CaseOptionsSettings />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsRolesSettings />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTimelineSettings />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingSettings />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsContractsSettings />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardLayoutSettings />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AISettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
