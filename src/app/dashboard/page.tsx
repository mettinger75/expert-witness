'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Clock, DollarSign, AlertTriangle } from 'lucide-react'

const stats = [
  { title: 'Active Cases', value: '0', icon: Briefcase, color: 'text-blue-600' },
  { title: 'Unbilled Hours', value: '0h', icon: Clock, color: 'text-amber-600' },
  { title: 'Outstanding Balance', value: '$0', icon: DollarSign, color: 'text-emerald-600' },
  { title: 'Upcoming Deadlines', value: '0', icon: AlertTriangle, color: 'text-red-600' },
]

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your expert witness practice"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No cases yet. Create your first case to get started.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
