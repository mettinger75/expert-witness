import type { Metadata } from "next"
import { Source_Sans_3, Source_Serif_4 } from "next/font/google"
import { Geist_Mono } from "next/font/google"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { OptionsProvider } from "@/components/providers/OptionsProvider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-source-sans",
})

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Expert Witness Practice Management",
  description: "Comprehensive case management system for expert witness practice",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${sourceSerif.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <OptionsProvider>
            {children}
          </OptionsProvider>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  )
}
