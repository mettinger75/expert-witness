'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ActiveTimer {
  caseId: string
  caseName: string
  description: string
  activityType: string
  startTime: number // Date.now()
}

interface UIState {
  sidebarCollapsed: boolean
  activeTimer: ActiveTimer | null
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  startTimer: (timer: Omit<ActiveTimer, 'startTime'>) => void
  stopTimer: () => ActiveTimer | null
  getTimerElapsed: () => number // seconds
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      activeTimer: null,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      startTimer: (timer) =>
        set({ activeTimer: { ...timer, startTime: Date.now() } }),
      stopTimer: () => {
        const timer = get().activeTimer
        set({ activeTimer: null })
        return timer
      },
      getTimerElapsed: () => {
        const timer = get().activeTimer
        if (!timer) return 0
        return Math.floor((Date.now() - timer.startTime) / 1000)
      },
    }),
    {
      name: 'expert-witness-ui',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return localStorage
      }),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeTimer: state.activeTimer,
      }),
    }
  )
)
