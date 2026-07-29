'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, FileCheck2, Gavel } from 'lucide-react'

interface ExpertFile {
  id: string
  label: string
  description: string
  href: string
  icon: React.ReactNode
  available: boolean
}

function getExpertFiles(token: string): ExpertFile[] {
  return [
    {
      id: 'cv',
      label: 'Curriculum Vitae',
      description: 'Current CV — credentials, publications, and prior testimony.',
      href: '/ettinger-cv.pdf',
      icon: <FileText className="h-5 w-5 text-[#DFC06A]" />,
      available: true,
    },
    {
      id: 'w9',
      label: 'W-9 Form',
      description: 'IRS Form W-9 for Mark Ettinger, M.D., P.A.',
      href: `/api/portal/${token}/w9`,
      icon: <FileCheck2 className="h-5 w-5 text-[#DFC06A]" />,
      available: true,
    },
    {
      id: 'deposition-history',
      label: 'Deposition History',
      description: 'List of prior depositions and trial testimony (last 4 years).',
      href: '/ettinger-deposition-history.pdf',
      icon: <Gavel className="h-5 w-5 text-[#DFC06A]" />,
      available: false,
    },
  ]
}

export function PortalExpertFiles({ token }: { token: string }) {
  const availableFiles = getExpertFiles(token).filter((f) => f.available)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#0E1F35] flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#DFC06A]" />
          Expert Files
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Credentialing documents for Mark Ettinger, M.D. Download directly from the links below.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {availableFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-start justify-between gap-4 p-4 border border-gray-200 rounded-lg hover:border-[#DFC06A]/50 hover:bg-[#FAF8F2] transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">{file.icon}</div>
                <div className="min-w-0">
                  <p className="font-medium text-[#0E1F35]">{file.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{file.description}</p>
                </div>
              </div>
              <a
                href={file.href}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="shrink-0"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#0E1F35]/20 text-[#0E1F35] hover:bg-[#0E1F35] hover:text-white"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              </a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
