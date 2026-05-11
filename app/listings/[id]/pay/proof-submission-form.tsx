'use client'

import { useRef, useState, useEffect, useActionState } from 'react'
import { toast } from 'sonner'
import { Upload, Clock, HelpCircle, Loader2 } from 'lucide-react'
import { submitPaymentProof } from '@/lib/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ProofSubmissionFormProps = {
  listingId: string
  messageValue: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProofSubmissionForm({ listingId, messageValue }: ProofSubmissionFormProps) {
  const storageKey = `bidlock-pay-${listingId}`
  const [referenceNumber, setReferenceNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [referenceError, setReferenceError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, action, pending] = useActionState(submitPaymentProof, undefined)

  // Restore reference number from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setReferenceNumber(saved)
  }, [storageKey])

  // Sync reference number to localStorage on change
  useEffect(() => {
    localStorage.setItem(storageKey, referenceNumber)
  }, [referenceNumber, storageKey])

  // Show server-side errors as toasts
  useEffect(() => {
    if (state?.error) toast.error(state.error)
  }, [state])

  const applyFile = (f: File | undefined) => {
    if (!f) return
    setFile(f)
    setFileError(null)
  }

  const validate = (): boolean => {
    let valid = true
    if (!/^\d{13}$/.test(referenceNumber)) {
      setReferenceError('Enter a valid 13-digit GCash reference number.')
      valid = false
    } else {
      setReferenceError(null)
    }
    if (!file) {
      setFileError('Payment proof screenshot is required.')
      valid = false
    } else if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Only JPEG, PNG, and WebP images are allowed.')
      valid = false
    } else if (file.size > MAX_SIZE) {
      setFileError('File must be under 5 MB.')
      valid = false
    } else {
      setFileError(null)
    }
    return valid
  }

  // Clear localStorage optimistically before action fires.
  // The action calls redirect() on success and never returns { success: true }.
  const wrappedAction = (formData: FormData) => {
    localStorage.removeItem(storageKey)
    return action(formData)
  }

  const isSubmittable = referenceNumber.length > 0 && file !== null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold">Submit payment proof</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">
        After sending payment, enter the details below.
      </p>

      <form
        action={wrappedAction}
        onSubmit={(e) => {
          if (!validate()) e.preventDefault()
        }}
        className="space-y-5"
      >
        <input type="hidden" name="listing_id" value={listingId} />
        <input type="hidden" name="payment_message" value={messageValue} />

        {/* GCash reference number */}
        <div>
          <Label htmlFor="payment_reference" className="text-sm font-medium mb-1.5 block">
            GCash reference number
          </Label>
          <Input
            id="payment_reference"
            name="payment_reference"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="13-digit reference"
            inputMode="numeric"
            className="focus-visible:ring-purple-500"
          />
          {referenceError ? (
            <p className="text-xs text-destructive mt-1">{referenceError}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Find this in your GCash transaction history.
            </p>
          )}
        </div>

        {/* Payment screenshot upload */}
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Payment screenshot</Label>
          <input
            ref={fileInputRef}
            type="file"
            name="proof"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => applyFile(e.target.files?.[0])}
          />
          <div
            className={cn(
              'border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors',
              isDragging ? 'border-purple-400 bg-purple-50' : 'border-gray-300',
              fileError && 'border-destructive'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              applyFile(e.dataTransfer.files[0])
            }}
          >
            {file ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                <Upload size={20} />
                <p className="text-sm">Choose a file or drag and drop</p>
                <p className="text-xs">JPG, PNG, max 5MB</p>
              </div>
            )}
          </div>
          {fileError ? (
            <p className="text-xs text-destructive mt-1">{fileError}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Your screenshot is stored securely and only viewed for payment verification.
            </p>
          )}
        </div>

        {/* Verification timeline trust signal */}
        <div className="flex items-start gap-2 text-muted-foreground">
          <Clock size={14} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            Payments are verified manually within 24 hours. Your listing goes live once verified.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={!isSubmittable || pending}
        >
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Submitting…
            </>
          ) : (
            'Submit proof'
          )}
        </Button>

        {/* Support contact */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <HelpCircle size={12} />
          <span>
            Wrong amount or missed the message?{' '}
            {/* TODO: wire to support feature */}
            <a href="#" className="underline">
              Contact support
            </a>
          </span>
        </div>
      </form>
    </div>
  )
}
