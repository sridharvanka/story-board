import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Storyboard',
  description: 'Capture ideas. See the connections. Build your outline.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
