'use client'

import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CopyableFieldProps = {
  label: string
  display: string
  copyValue: string
  fieldKey: string
  copiedField: string | null
  onCopy: (value: string, key: string) => void
}

export function CopyableField({
  label,
  display,
  copyValue,
  fieldKey,
  copiedField,
  onCopy,
}: CopyableFieldProps) {
  const isCopied = copiedField === fieldKey

  return (
    <div
      className="flex items-center gap-3 py-2 cursor-pointer"
      onClick={() => onCopy(copyValue, fieldKey)}
    >
      <span className="text-sm text-muted-foreground w-[120px] shrink-0">{label}</span>
      <span className="font-mono text-base font-semibold flex-1">{display}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs gap-1 shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onCopy(copyValue, fieldKey)
        }}
        aria-label={isCopied ? 'Copied' : `Copy ${label}`}
      >
        {isCopied ? (
          <>
            <Check size={14} className="text-green-600" />
            <span className="text-green-600">Copied</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>Copy</span>
          </>
        )}
      </Button>
    </div>
  )
}
