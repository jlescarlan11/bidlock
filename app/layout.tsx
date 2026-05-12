import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from 'sonner'
import Nav from '@/components/nav'
import NavWrapper from '@/components/nav-wrapper'
import Footer from '@/components/footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'BidLock',
    template: '%s — BidLock',
  },
  description: 'Philippine auction marketplace — bid on real items, pay via GCash.',
  openGraph: {
    type: 'website',
    siteName: 'BidLock',
    title: 'BidLock',
    description: 'Philippine auction marketplace — bid on real items, pay via GCash.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} scroll-smooth`}>
      <body className={`${inter.className} bg-background`}>
        <NavWrapper><Nav /></NavWrapper>
        {children}
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
