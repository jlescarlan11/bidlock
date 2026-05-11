import { ShieldCheck, Lock, BadgeCheck } from 'lucide-react'

export function TrustSignals() {
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="h-3 w-3" />
        Bank-grade encryption
      </span>
      <span className="text-slate-300 text-xs" aria-hidden="true">·</span>
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Lock className="h-3 w-3" />
        Verified bidders only
      </span>
      <span className="text-slate-300 text-xs" aria-hidden="true">·</span>
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <BadgeCheck className="h-3 w-3" />
        Trusted by 10,000+ collectors
      </span>
    </div>
  )
}
