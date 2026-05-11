import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

export function FeeDisclosureCallout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-md px-4 py-3 flex items-start gap-2 mb-5">
      <Info size={14} className="text-purple-500 mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-sm text-purple-900">{children}</p>
    </div>
  )
}
