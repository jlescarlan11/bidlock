'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-4">
      <p className="text-5xl font-black text-destructive">!</p>
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred. Try again or return to the home page.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          ← Home
        </Link>
      </div>
    </main>
  )
}
