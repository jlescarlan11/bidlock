'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'bids',     label: 'My Bids',     href: '/me?tab=bids' },
  { key: 'listings', label: 'My Listings', href: '/me?tab=listings' },
] as const

export default function ActivityTabBar() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'bids'

  return (
    <div className="flex border-b border-border mb-6">
      {TABS.map(({ key, label, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={tab === key ? 'page' : undefined}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
