import Link from 'next/link'

type HeroStats = {
  itemsSold: number
  activeBids: number
  totalSold: number
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M+`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K+`
  return String(n)
}

export default function LandingHero({ stats }: { stats: HeroStats }) {
  return (
    <section className="bg-violet-50 flex-1 flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full py-16">
        <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase mb-5">
          Live Auctions · PH
        </p>
        <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 text-foreground">
          Going once.<br />
          Going twice.<br />
          <span className="text-primary">Yours.</span>
        </h1>
        <div className="flex items-center gap-5 mb-10">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-[15px] font-bold hover:bg-primary/90 active:scale-95 transition-all"
          >
            <span aria-hidden="true">🔨</span> Place a Bid
          </Link>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sell an item <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-black text-foreground leading-none">{formatStat(stats.itemsSold)}</p>
            <p className="text-xs text-muted-foreground mt-1">Items sold</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-2xl font-black text-foreground leading-none">{formatStat(stats.activeBids)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active bids</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-2xl font-black text-foreground leading-none">₱{formatStat(stats.totalSold)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total sold</p>
          </div>
        </div>
      </div>
    </section>
  )
}
