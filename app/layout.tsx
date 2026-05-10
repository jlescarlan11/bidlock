import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'
import Nav from '@/components/nav'
import './globals.css'

const inter = localFont({
  src: '../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'BidLock',
  description: 'Philippine auction marketplace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <Nav />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
