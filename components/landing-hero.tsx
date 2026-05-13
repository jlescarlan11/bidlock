import Link from 'next/link'

type HeroStats = {
  liveCount: number
  avgBidsPerItem: number
  newToday: number
}

export default function LandingHero({ stats }: { stats: HeroStats }) {
  return (
    <div>
      <h1 className="display text-6xl lg:text-8xl font-extrabold leading-[0.95] mb-6 text-gray-900">
          Going once.<br />
          Going twice.<br />
          <span className="relative inline-block">
            <span className="relative z-10">Yours.</span>
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                className="scribble"
                d="M5 12 Q 80 2, 150 10 T 295 8"
                stroke="#F97316"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
        </h1>

        <p className="text-lg text-gray-700 mb-8 max-w-xl leading-relaxed">
          Score steals on phones, watches, cameras, sneakers, and more.
          Starting bids from <span className="font-bold text-gray-900">₱1</span>. Pay via GCash when you win.
        </p>

        <div className="flex flex-wrap items-center gap-4 mb-10">
          <Link
            href="/auctions"
            className="group inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full text-base font-bold hover:bg-gray-800 transition-all"
          >
            Browse live auctions
            <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
          <Link
            href="/how"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-4 decoration-orange-500 decoration-2"
          >
            How does it work?
          </Link>
        </div>

        {/* Stat strip */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-baseline gap-2">
            <span className="display text-2xl font-extrabold text-gray-900">{stats.liveCount}</span>
            <span className="text-xs text-gray-600">live now</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="display text-2xl font-extrabold text-gray-900">{stats.avgBidsPerItem}</span>
            <span className="text-xs text-gray-600">avg. bids/item</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="display text-2xl font-extrabold text-gray-900">{stats.newToday}</span>
            <span className="text-xs text-gray-600">new today</span>
          </div>
        </div>
    </div>
  )
}
