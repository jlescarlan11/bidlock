import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import Nav from '@/components/nav'
import NavWrapper from '@/components/nav-wrapper'
import './globals.css'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BidLock',
  description: 'Philippine auction marketplace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={font.className}>
        <NavWrapper><Nav /></NavWrapper>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
