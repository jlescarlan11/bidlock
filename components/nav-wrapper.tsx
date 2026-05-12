'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) return
    const handler = () => setScrolled(window.scrollY > 10)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [isHome])

  const white = !isHome || scrolled

  return (
    <header
      className={`sticky top-0 z-10 transition-colors duration-300 ${
        white ? 'bg-background border-b border-gray-900/10' : 'bg-background'
      }`}
    >
      {children}
    </header>
  )
}
