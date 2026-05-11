import { ShieldCheck } from 'lucide-react'

export function SecurityBadge({ label = 'Secure sign in' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1">
      <ShieldCheck className="h-3 w-3 text-violet-700" aria-hidden="true" />
      <span className="text-xs font-medium text-violet-700">{label}</span>
    </div>
  )
}
