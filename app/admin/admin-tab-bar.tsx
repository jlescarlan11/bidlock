'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const tabs = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Listings', href: '/admin/listings' },
  { label: 'Disputes', href: '/admin/disputes' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Settings', href: '/admin/settings' },
]

export default function AdminTabBar() {
  const pathname = usePathname()
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [pathname])

  return (
    <div className="border-b">
      <nav className="max-w-7xl mx-auto px-6 flex overflow-x-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={isActive ? activeRef : undefined}
              className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
