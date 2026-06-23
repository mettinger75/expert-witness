import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from 'sonner'

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-[#F0F2F5]">
        {/* Minimal header */}
        <header className="bg-[#0E1F35] border-b border-[#1C3555]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#DFC06A' }}>
              <svg viewBox="0 0 310 310" width={20} height={20} xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFFFFF" d="M306.8,157.5l-114.9-28.1,52.4-66.5-68.3,50.8L152.8,0l-28.5,113.7L58.6,60.3l49.9,67.6L0,151.8l107.6,27.5-52,66.1,66.6-49.7,24.6,114.4,27.6-113.2,69.1,55.1-52.9-70.6,116.3-24ZM285.3,157l-114.4-1.9,17.3-22.1,97.1,24ZM230.1,76.5l-80.8,77.7v-18.2l80.8-59.5ZM152.2,21l-2.2,112.1-22-16.9,24.2-95.1ZM16.5,152l111,2.2-16.6,22-94.4-24.2ZM70.1,231.2l79.1-76.2h-18.2l-58.5-79.7,76.7,79.7-.9,19.3-78.2,56.8ZM147.5,289.3l1.8-113.2,21.9,17-23.7,96.1ZM228,235.3l-77.7-80.2h17.6l60.1,80.2Z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>Mark Ettinger, M.D.</div>
              <div className="text-[#DFC06A] text-xs" style={{ letterSpacing: '0.1em' }}>Expert Witness — Anesthesiology</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t bg-white mt-12">
          <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-muted-foreground">
            This document was shared securely by Mark Ettinger, M.D. — Expert Witness Practice Manager
          </div>
        </footer>
      </div>
      <Toaster position="top-center" />
    </QueryProvider>
  )
}
