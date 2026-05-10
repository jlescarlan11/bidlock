import Link from 'next/link'

export default function LandingHero() {
  return (
    <section className="bg-violet-50 px-6 py-10">
      <div className="max-w-2xl mx-auto flex gap-6 items-center">
        {/* Left — text + CTAs */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em] text-violet-600 uppercase mb-2.5">
            Live Auctions · PH
          </p>
          <h1 className="text-4xl font-black leading-[1.1] mb-3 text-stone-950">
            Going once.<br />
            Going twice.<br />
            <span className="text-violet-600">Yours.</span>
          </h1>
          <p className="text-[15px] text-gray-500 mb-5 leading-relaxed">
            Win real items at real prices.<br />
            Pay instantly via GCash.
          </p>
          <a
            href="#live-auctions"
            className="inline-flex items-center gap-1.5 bg-violet-600 text-white px-6 py-3 rounded-full text-[15px] font-bold hover:bg-violet-700 transition-colors"
          >
            🔨 Place a Bid
          </a>
          <Link
            href="/listings/new"
            className="block mt-2.5 text-xs text-violet-600 hover:underline"
          >
            Got something to sell? List it here →
          </Link>
        </div>

        {/* Right — non-interactive proof-of-life card */}
        <div className="w-40 shrink-0 bg-white rounded-2xl border border-violet-100 p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-orange-600 mb-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
            04:32 left
          </p>
          <div className="bg-violet-50 rounded-xl h-20 flex items-center justify-center text-4xl mb-2">
            ⌚
          </div>
          <p className="text-xs font-bold text-stone-950 mb-1">Vintage Seiko Watch</p>
          <p className="text-[10px] text-gray-400 mb-1.5">14 bids so far</p>
          <p className="text-lg font-black text-orange-600">₱2,450</p>
          <p className="text-[9px] text-gray-400 mt-0.5">Current bid</p>
        </div>
      </div>
    </section>
  )
}
