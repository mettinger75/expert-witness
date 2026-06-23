import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Case Portal — Mark Ettinger, M.D.',
  description: 'Attorney case portal',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navy header bar */}
      <header className="bg-[#0E1F35] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#DFC06A] flex items-center justify-center text-[#0E1F35] font-bold text-sm">
            ME
          </div>
          <div>
            <h1 className="text-sm font-semibold">Mark Ettinger, M.D.</h1>
            <p className="text-xs text-gray-300">Expert Witness — Case Portal</p>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
