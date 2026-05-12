import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-900/10 mt-8">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="display text-xl font-extrabold">BidLock</span>
          <p className="text-xs text-gray-500 mt-1">Real items. Real prices. PH-made.</p>
        </div>
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <Link href="/terms" className="hover:text-gray-900">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
          <Link href="/help" className="hover:text-gray-900">Help</Link>
          <Link href="/contact" className="hover:text-gray-900">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
