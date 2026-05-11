import { ShieldCheck } from 'lucide-react'

export function SecurityBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1">
      <ShieldCheck className="h-3 w-3 text-violet-700" />
      <span className="text-xs font-medium text-violet-700">Secure sign in</span>
    </div>
  )
}
