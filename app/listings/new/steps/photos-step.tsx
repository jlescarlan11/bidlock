'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

type PhotoEntry = { file: File; url: string }

type Props = {
  onBack: () => void
  onNext: (photos: File[]) => void
}

export default function PhotosStep({ onBack, onNext }: Props) {
  const [entries, setEntries] = useState<PhotoEntry[]>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => entries.forEach((e) => URL.revokeObjectURL(e.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected)
    const invalid = arr.find(
      (f) => f.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (invalid) { setError('Each file must be jpg/png/webp and under 5 MB.'); return }

    const newEntries = arr.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    setError('')
    setEntries((prev) => [...prev, ...newEntries].slice(0, 5))

    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(i: number) {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function handleNext() {
    if (entries.length < 1) { setError('Upload at least 1 photo.'); return }
    onNext(entries.map((e) => e.file))
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50"
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-muted-foreground text-sm">
          Tap to add photos (1–5, max 5 MB each, jpg/png/webp)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {entries.map((entry, i) => (
            <div key={entry.url} className="relative aspect-square rounded overflow-hidden bg-muted">
              <Image src={entry.url} alt="" fill className="object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                onClick={() => removeFile(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        <Button type="button" className="flex-1" onClick={handleNext}>Next: Review →</Button>
      </div>
    </div>
  )
}
