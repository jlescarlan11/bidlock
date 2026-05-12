import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how to bid and sell on BidLock — the Philippine auction marketplace.',
}

const buyerSteps = [
  { icon: '🔍', title: 'Browse live auctions', body: 'Scroll the live listings. Filter by ending soon, just listed, or price.' },
  { icon: '💬', title: 'Place a bid', body: 'Enter any amount above the current bid. No deposits, no card holds.' },
  { icon: '🏆', title: 'Win when time runs out', body: "Highest bidder when the clock hits zero wins. That's it." },
  { icon: '💸', title: 'Pay via GCash', body: 'Send the winning amount via GCash within 24 hours.' },
  { icon: '📦', title: 'Receive your item', body: 'Seller ships to you. You get what you won.' },
]

const sellerSteps = [
  { icon: '📸', title: 'Snap a photo', body: 'Take a clear photo of your item. Good photos get more bids.' },
  { icon: '✍️', title: 'Set your starting bid', body: "Pick a price you'd happily accept even if only one person bids." },
  { icon: '⏱', title: 'Choose an end time', body: 'Set how long the auction runs — 1 hour, 6 hours, 24 hours, or more.' },
  { icon: '📣', title: 'Watch the bids roll in', body: 'Buyers compete. You watch. No action needed from you.' },
  { icon: '✅', title: 'Collect payment', body: 'Winner sends GCash. You ship. Done.' },
]

function StepList({ steps }: { steps: typeof buyerSteps }) {
  return (
    <ol className="space-y-8">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-5">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-extrabold">
              {i + 1}
            </span>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 min-h-[24px]" aria-hidden="true" />
            )}
          </div>
          <div className="pb-2">
            <span className="text-3xl" aria-hidden="true">{step.icon}</span>
            <p className="display text-lg font-extrabold text-gray-900 mt-2 mb-1">{step.title}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function HowItWorksPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <p className="text-xs font-extrabold tracking-[0.18em] text-orange-600 uppercase mb-3">How it works</p>
        <h1 className="display text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4">Winning made simple.</h1>
        <p className="text-lg text-gray-600">No confusing rules. No hidden fees. Just bid, win, pay, done.</p>
      </div>

      {/* Two-column steps */}
      <div className="grid md:grid-cols-2 gap-16 mb-20">
        <div>
          <h2 className="display text-2xl font-extrabold text-gray-900 mb-8">I want to win something</h2>
          <StepList steps={buyerSteps} />
        </div>
        <div>
          <h2 className="display text-2xl font-extrabold text-gray-900 mb-8">I want to sell something</h2>
          <StepList steps={sellerSteps} />
        </div>
      </div>

      {/* CTA strip */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gray-900 text-white rounded-3xl p-8 flex flex-col gap-4">
          <p className="display text-2xl font-extrabold">Ready to bid?</p>
          <p className="text-sm text-gray-400">Live auctions running right now. Jump in.</p>
          <Link
            href="/auctions"
            className="self-start inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
          >
            Browse live auctions →
          </Link>
        </div>
        <div className="bg-orange-500 text-white rounded-3xl p-8 flex flex-col gap-4">
          <p className="display text-2xl font-extrabold">Ready to sell?</p>
          <p className="text-sm text-orange-100">List your item in 60 seconds. No listing fees.</p>
          <Link
            href="/listings/new"
            className="self-start inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-full text-sm font-bold hover:bg-orange-50 transition-colors"
          >
            List an item →
          </Link>
        </div>
      </div>
    </main>
  )
}
