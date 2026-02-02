'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import { Briefcase, Clock, DollarSign, AlertTriangle } from 'lucide-react'

const stats = [
  { title: 'Active Cases', value: '0', icon: Briefcase, color: '#091525' },
  { title: 'Unbilled Hours', value: '0h', icon: Clock, color: '#F59E0B' },
  { title: 'Outstanding Balance', value: '$0', icon: DollarSign, color: '#10B981' },
  { title: 'Upcoming Deadlines', value: '0', icon: AlertTriangle, color: '#EF4444' },
]

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <PageHeader
        title="Dashboard"
        description="Overview of your expert witness practice"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-500">{stat.title}</p>
              <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <p className="text-3xl font-semibold text-neutral-900 tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-3" style={{ backgroundColor: '#091525' }}>
            <h2
              className="text-sm font-semibold tracking-wide text-white"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Recent Cases
            </h2>
          </div>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />
          <div className="p-6">
            <p className="text-sm text-neutral-500">No cases yet. Create your first case to get started.</p>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-3" style={{ backgroundColor: '#091525' }}>
            <h2
              className="text-sm font-semibold tracking-wide text-white"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Upcoming Deadlines
            </h2>
          </div>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />
          <div className="p-6">
            <p className="text-sm text-neutral-500">No upcoming deadlines.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
