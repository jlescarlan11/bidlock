'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { CopyableField } from './copyable-field'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'

type PaymentDetailsCardProps = {
  listingTitle: string
  listingFee: number
  gcashQrUrl: string | null
  gcashNumber: string
  gcashName: string
  messageValue: string
}

export function PaymentDetailsCard({
  listingTitle,
  listingFee,
  gcashQrUrl,
  gcashNumber,
  gcashName,
  messageValue,
}: PaymentDetailsCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = async (text: string, key: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      await navigator.clipboard.writeText(text.trim())
    } catch {
      const el = document.createElement('textarea')
      el.value = text.trim()
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedField(key)
    timerRef.current = setTimeout(() => setCopiedField(null), 1500)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      {/* Listing header */}
      <div>
        <p className="text-xs text-muted-foreground">Paying for</p>
        <p className="text-lg font-semibold">{listingTitle}</p>
      </div>

      {/* QR block */}
      <div className="flex flex-col items-center gap-2">
        {gcashQrUrl ? (
          <Image
            src={gcashQrUrl}
            alt="GCash QR code"
            width={200}
            height={200}
            className="rounded-lg"
          />
        ) : (
          <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon size={32} />
            <p className="text-xs text-center px-4">
              QR not configured — use the GCash number below
            </p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">Scan with GCash app</p>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-muted-foreground bg-white px-1">OR</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      {/* Copyable fields */}
      <div className="divide-y divide-gray-100">
        <CopyableField
          label="GCash number"
          display={gcashNumber}
          copyValue={gcashNumber}
          fieldKey="gcash-number"
          copiedField={copiedField}
          onCopy={handleCopy}
        />
        <CopyableField
          label="Amount"
          display={`₱${listingFee}`}
          copyValue={String(listingFee)}
          fieldKey="amount"
          copiedField={copiedField}
          onCopy={handleCopy}
        />
        <CopyableField
          label="Message"
          display={messageValue}
          copyValue={messageValue.trim()}
          fieldKey="message"
          copiedField={copiedField}
          onCopy={handleCopy}
        />
      </div>

      {/* Recipient verification */}
      <FeeDisclosureCallout>
        Confirm the recipient shows as <strong>{gcashName}</strong> in GCash before sending.
      </FeeDisclosureCallout>
    </div>
  )
}
