import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mark Ettinger, M.D. — Expert Witness in Anesthesiology',
  description:
    'Board-certified anesthesiologist providing expert witness consultation and testimony for medical malpractice, personal injury, and critical care cases. Johns Hopkins trained. 10+ years of expert witness experience.',
  openGraph: {
    title: 'Mark Ettinger, M.D. — Expert Witness in Anesthesiology',
    description:
      'Board-certified anesthesiologist providing expert witness consultation and testimony. Johns Hopkins trained. Dallas, Texas.',
    type: 'website',
  },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
