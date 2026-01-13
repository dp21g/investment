import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investment Strategy Analyzer',
  description: 'Compare recurring investment strategies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
