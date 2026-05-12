import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-4">
      <p className="text-5xl font-black text-primary">404</p>
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        The listing or page you&apos;re looking for doesn&apos;t exist or has already ended.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        ← Back to home
      </Link>
    </main>
  )
}
